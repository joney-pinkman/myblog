var mongodb = require('./db');

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
			},function(err,comment){
				console.log('save ',comment);
				mongodb.close();
				if(err){
					return callback(err);
				}
				if(!comment.replyID){
					return callback(null,comment);
				}
				collection.findOne({
					'_id':comment.replyID
				},function(err,cmtTmp){
					if(err){
						return callback(err);
					}
					cmtTmp.recallID.push(comment._id);
					collection.update({'_id':comment.replyID},{$set:{'recallID':cmtTmp.recallID}},function(err){
						if(err){
							return callback(err);
						}
						callback(null,comment);
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
				console.log('getall',comments,'blogID',blogID);
				mongodb.close();
				if(err){
					return callback(err);
				}
				
				function search(_id){
					
					for(var i=0;i<comments.length;i++){
						if(comments[i]._id ==_id){
							return comments[i]._id;
						}
					}
					
				}
				
				
				function foo(tree,arrID){
					tree.child = [];
					
					var tmp ;
					arrID.forEach(function(item,index){
						tmp = search(item);
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
				
				
				callback(null,cmtFinal);
			});
		})
	});
};