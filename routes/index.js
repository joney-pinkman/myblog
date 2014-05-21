
/*
 * GET home page.
 */
var crypto = require('crypto'),
	fs = require('fs'),
	User = require('../models/user.js'),
	Post = require('../models/post.js'),
	Comment = require('../models/comment.js');

function checkLogin(req,res,next){
	if(!req.session.user){
		req.flash('error','未登录!');
		res.redirect('/login');
	}
	next();
}

function checkNotLogin(req,res,next){
	if(req.session.user){
		req.flash('error','已登陆！');
		res.redirect('back');
	}
	next();
}
module.exports = function(app) {
	app.get('/', function(req, res) {
		
		if(req.session.user){
			Post.getAll('',function(err,docs){
				if(err){
					req.flash('error',err);
					docs = [];
				}
				
				res.render('index', {
					title : '主页',
					user:req.session.user,
					docs:docs,
					success:req.flash('success').toString(),
					error:req.flash('error').toString()
				});
				
			});
		}else{
			res.render('index', {
				title : '主页',
				user:req.session.user,
				docs:[],
				success:req.flash('success').toString(),
				error:req.flash('error').toString()
			});
		}

	});
	
	app.get('/upload', checkLogin);
	app.get('/upload', function (req, res) {
	  res.render('upload', {
	    title: '文件上传',
	    user: req.session.user,
	    success: req.flash('success').toString(),
	    error: req.flash('error').toString()
	  });
	});
	
	app.post('/upload',checkLogin);
	app.post('/upload',function(req,res){
		
		for(var i in req.files){
			if(req.files[i].size ==0){
				fs.unlinkSync(req.files[i].path);
				
			}else{
				
				var target_path = './public/images/' + req.files[i].name;
				
				fs.renameSync(req.files[i].path,target_path);
				
			}
			
		}
		req.flash('success','file upload success');
		res.redirect('/upload');
	});
	app.get('/u/:name',checkLogin);
	app.get('/u/:name',function(req,res){
		User.get(req.params.name,function(err,user){
			if(!user){
				req.flash('error','user is not exists');
				return res.redirect('/');
			}
			Post.getAll(user.name,function(err,docs){
				if (err) {
			        req.flash('error', err); 
			        return res.redirect('/');
			      } 
			      res.render('user', {
			        title: user.name,
			        
			        docs:docs,
			        user : req.session.user,
			        success : req.flash('success').toString(),
			        error : req.flash('error').toString()
			      });
			    
			});
		});
	});
	
	app.post('/u/:name',function(req,res){
		console.log('req.body',req.body);
		console.log('req.files',req.files);
		
	});
	app.get('/u/:name/:day/:title',function(req,res){
		
		User.get(req.params.name,function(err,user){
			if(err || !user || !req.params.day || !req.params.title){
				req.flash('error','user is not exists');
				return res.redirect('/');
			}
			
			Post.getOne(user.name,req.params.day,req.params.title,function(err,doc){
				if (err) {
					req.flash('error', err); 
					return res.redirect('/');
				} 
				Comment.getAll(doc._id,function(err,comments){
					if (err) {
						req.flash('error', err); 
						return res.redirect('/');
					} 

					var date = new Date();
					function handle(arr){
						arr.forEach(function(item,index){
							if(item.timeStamp){
								date.setTime(item.timeStamp);
								item.time =  date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
							      date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());

							}else{
								item.time = '';
							}
							if(item.child && item.child.length){
								item.child = handle(item.child);
							}
						});
						return arr;
						
					}
					comments = handle(comments);
					/*
					comments.forEach(function(item,index){
						if(item.timeStamp){
							date.setTime(item.timeStamp);
							item.time =  date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + 
						      date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());

						}else{
							item.time = '';
						}
						
					});
					*/
					res.render('user', {
						title: user.name,

						doc:doc,
						comments:comments,
						user : req.session.user,
						success : req.flash('success').toString(),
						error : req.flash('error').toString()
					});
					
				});
				
			    
			});
		});
	});
	app.post('/u/:name/:day/:title/reply',function(req,res){
		var comment = new Comment({
			userName:req.session.user.name,
			replyID:req.body.replyID,
			replyName:req.body.replyName,
			blogID:req.body.blogID,
			content:req.body.content
			
		});
		var url = '/u/'+req.params.name+'/'+req.params.day+'/'+req.params.title; 
		comment.save(function(err){
			if (err) {
				req.flash('error', err); 
				return res.json({success:false,message:err.toString()});
			} 
			req.flash('error','comment success');
			
			res.json({success:true});
		})
	});
	
	app.post('/u/:name/:day/:title',function(req,res){
		
		if(!req.body.content){
			req.flash('error','no content in your comment');
			return res.redirect(req.originalUrl);
		}
		if(!req.session.user){
			req.flash('error','you are not login');
			return res.redirect(req.originalUrl);
		}
		if(req.session.user.name == req.params.name){
			req.flash('error','you can not comment your blog');
			return res.redirect(req.originalUrl);
		}

		var comment = new Comment({
			userID:req.session.user._id,
			userName:req.session.user.name,
			blogID:req.body.blogID,
			content:req.body.content
			
		});
		comment.save(function(err){
			if (err) {
				req.flash('error', err); 
				
			} 
			res.redirect(req.originalUrl);
		});
		
	});
	
	
	app.get('/edit/:name/:day/:title',checkLogin);
	app.get('/edit/:name/:day/:title',function(req,res){
		if(req.params.name !=req.session.user.name){
			req.flash('error','this user is not yours');
			return res.redirect('/');
		}
		Post.getOne(req.params.name,req.params.day,req.params.title,function(err,doc){
			
			if (err) {
		        req.flash('error', err); 
		        return res.redirect('/');
		      } 
		      res.render('edit', {
		        
		       title:'edit',
		        doc:doc,
		        user : req.session.user,
		        success : req.flash('success').toString(),
		        error : req.flash('error').toString()
		      });
		    
		});
		
	});
	app.post('/edit/:name/:day/:title',function(req,res){
		if(req.params.name !=req.session.user.name){
			req.flash('error','this user is not yours');
			return res.redirect('/');
		}
		Post.update(user.name,req.params.day,req.body.title,req.body.content,function(err,doc){
			if (err) {
		        req.flash('error', err); 
		        return res.redirect('/');
		      } 
		      res.render('edit', {
		        title: user.name,
		       
		        doc:doc,
		        user : req.session.user,
		        success : req.flash('success').toString(),
		        error : req.flash('error').toString()
		      });
		    
		});
		
	});
	
	app.get('/login',checkNotLogin);
	app.get('/login', function(req, res) {
	
		res.render('login', {
			title : '登陆',
			user:req.session.user,
			success:req.flash('success').toString(),
			error:req.flash('error').toString()
		});
	});
	app.post('/login',checkNotLogin);
	app.post('/login', function(req, res) {
		var name = req.body.name;

		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		
		
		User.get(name,function(err,user){
			if(err){
				req.flash('error',err);
				return res.redirect('/login');
			}
			
			if(user == null){
				req.flash('error','账号不存在');
				return res.redirect('/login');
			}
			
			
			if(user.password != password){
				req.flash('error','密码错误');
				return res.redirect('/login');
			}
			req.flash('success','登陆成功');
			req.session.user = user;
			return res.redirect('/');
		});
		
	});
	
	app.get('/register',checkNotLogin);
	app.get('/register',function(req,res){
		
		res.render('register', {
			title : '注册',
			user:req.session.user,
			success:req.flash('success').toString(),
			error:req.flash('error').toString()
		});
	});
	app.post('/register',checkNotLogin);
	app.post('/register',function(req,res){
		var name = req.body.name,
			password = req.body.password,
			repeat = req.body.repeat;
		
		if(repeat != password){
			req.flash('error','两次输入的密码不一致!');
			return res.redirect('/register');
		}
		
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');
		
		var newUser = new User({
			name:req.body.name,
			password:password,
			email:req.body.email
		});
		
		User.get(newUser.name,function(err,user){
			if(user){
				req.flash('error','用户已存在!');
				return res.redirect('/register');
			}
			newUser.save(function(err,user){
				if(err){
					req.flash('error',err);
					return res.redirect('/register');
				}
				
				req.session.user = user;
				req.flash('success','注册成功!');
				res.redirect('/');
			});
		});
	});
	app.get('/post',checkLogin);
	app.get('/post',function(req,res){
		res.render('post', {
			title : '发表',
			user:req.session.user,
			success:req.flash('success').toString(),
			error:req.flash('error').toString()
		});
	});
	app.post('/post',checkLogin);
	app.post('/post',function(req,res){
		
		
		var currentUser = req.session.user,
			post = new Post(currentUser.name,req.body.title,req.body.post);
		post.save(function(err){
			if(err){
				req.flash('error',err);
				return res.redirect('/');
			}
			req.flash('success','发布成功!');
			res.redirect('/');
		})
	});
	
	app.get('/logout',checkLogin);
	app.get('/logout',function(req,res){
		req.session.user = null;
		return res.redirect('/');
	});
};