var mongodb = require('./db');
var ObjectID = require('mongodb').ObjectID;
function Comment(obj){
	this.userName = obj.userName;
	this.blogID = obj.blogID;
	this.content = obj.content;
	this.replyName = obj.replyName || '';
	this.replyID = obj.replyID || '';
	this.recallID = [];
	var date = new Date();
	this.timeStamp = date.getTime();
};

module.exports = Comment;

Comment.prototype.save = function(callback){
	var comment = {
			userName:this.userName,
			blogID :this.blogID,
			content:this.content,
			replyName:this.replyName,
			replyID:this.replyID,
			recallID :this.recallID,
			timeStamp:this.timeStamp
	};
	console.log('comment',comment);
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		
		db.collection('comment',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.insert(comment,{
				safe:true
			},function(err,cmt){
				
				if(err){
					return callback(err);
				}
				if(!comment.replyID){
					mongodb.close();
					return callback(null,cmt);
				}
				
				collection.findOne({
					'_id':new ObjectID(comment.replyID)
				},function(err,cmtTmp){
					if(err){
						return callback(err);
					}
					console.log('cmtTmp',cmtTmp);
					cmtTmp.recallID.push(comment._id);
					collection.update({'_id':new ObjectID(comment.replyID)},{$set:{'recallID':cmtTmp.recallID}},function(err){
						mongodb.close();
						if(err){
							return callback(err);
						}
						callback(null,cmt);
					})
				});
			
			});
		});
	});
};

Comment.getAll = function(blogID,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		
		db.collection('comment',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			
			collection.find({
				blogID:blogID.toString()
			}).sort({blogID:-1}).toArray(function(err,comments){
				mongodb.close();
				if(err){
					return callback(err);
				}
				
				function search(_id){
					
					for(var i=0;i<comments.length;i++){
						if(comments[i]._id.toString() ==_id){
							return comments[i];
						}
					}
					
				}
				
				
				function foo(tree,arrID){
					tree.child = [];
					console.log('arrID',arrID[0]);
					var tmp ;
					arrID.forEach(function(item,index){
						tmp = search(item);
						console.log('tmp',tmp);
						if(tmp.recallID.length){
							foo(tmp,tmp.recallID);
						}
						tree.child.push(tmp);
					})
				}
				var cmtFinal = comments.filter(function(item,index){
					return item.replyID.length ==0;
				});
				cmtFinal.forEach(function(item,index){
					
					foo(item,item.recallID);
				});
				console.log(cmtFinal);
				
				callback(null,cmtFinal);
			});
		})
	});
};