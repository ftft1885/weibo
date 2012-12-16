var http	=	require('http');
var fs		=	require('fs');
var https	=	require('https');
var url_parse	=	require('url').parse;
var agent	=	require('superagent').agent();
//var cookie	=	require('cookie');
var querystring	=	require('querystring');
var canvas	=	require('canvas');
//var img = new canvas.Image;
var exec	=	require('child_process').exec;


var userList = {};//store all user
/*
{
	uid:{ac_token:asdad,expire:ascfcs},
}
*/

var $ = {};//global var

http.createServer(function(req,res)
{
	//check cookie
	var path = url_parse(req.url).pathname;
	console.log(path);
	if(path.indexOf('/weibo') == 0)//check weibo coookie
	{
		if(isOldUser(req.headers.cookie))//if oldUser
		{
			console.log("has a cookie");
			var uid = getUid(req.headers.cookie);
			if(path == "/weibo/response")//redirect to /weibo
			{
				var html = "<script>window.location.href='/weibo'</script>";
				res.end(html);
			}
			if(path == "/weibo")//oldUser and /weibo mains redirect
			{
				//it is ture index
				
				
				
				var html = fs.readFileSync('./weibo.html');	
				res.writeHead(200,{'Content-Type':'text/html'});
				res.end(html);
			}
			if(path == "/weibo/imgcheck")
			{
				req.on('data',function(data){
					//console.log(data+"");
					//res.end(data+"");
					var url = data + "";
					http.get(url,function(_res){
						//console.log(res.headers);
						var size = _res.headers['content-length'];
						var json = {
							size	:	size,
							id		:	url,
						}
						var str = JSON.stringify(json);
						console.log(str);
						res.end(str);
					});
				});
			}
			if(path == "/weibo/get")
			{
					
				//var need = url_parse(req.url).query.split('=')[1];
				//console.log("need = "+need);
				var query_str = url_parse(req.url).query;
				var query_json = querystring.parse(query_str);
				//var need = query_json.need;
				var opts = {};
				for(var key in query_json)
				{
					opts[key] = query_json[key];
				}
				opts.id = uid;
				console.log(opts);
				getWeiboJson(opts,function(result)//use callback just status
				{
					var json_result = JSON.parse(result);
					//console.log(json_result)
					res.end(result);
				});				
			}
			if(path == "/weibo/comments")//client send a weibo id
			{				
				console.log("query = "+ url_parse(req.url).query);
				var queryStr = url_parse(req.url).query;
				var queryArr = queryStr.split('&');
				
				var need = queryArr[0].split('=')[1];
				var id = queryArr[1].split('=')[1];
				
				var opt = {'need':need,'id':id,'uid':uid};
				getWeiboCommentJson(opt,function(result)//use callback just status
				{
					res.end(result);
				});
				
			}
			
		}
		
		//no cookie		
		else
		{
			console.log("no cookie!!!!!");
			
			res.cookie = function(name, val, options){
				options = options || {};
				
				if ('object' == typeof val) val = 'j:' + JSON.stringify(val);				
				if ('maxAge' in options) options.expires = new Date(Date.now() + options.maxAge);
				if (null == options.path) options.path = '/';
				options.maxAge /= 1000;
				res.setHeader('Set-Cookie', cookie.serialize(name, String(val), options));
				return this;
			};
			
			
			if(path == "/weibo/response")//require for access_token
			{
				var code = url_parse(req.url).query.split('=')[1];
				agent.post("https://api.weibo.com/oauth2/access_token")
				.send("client_id=3588356401&client_secret=3aa3037ba9577203c889b9aa66dc2ad5"+
					"&grant_type=authorization_code&redirect_uri=http://42.121.108.75/weibo/response&code="+code)
				.end(function(err,res1)
				{
					var json = JSON.parse(res1.text);
					//console.log(json);
					//userList.push(json);
					userList[json['uid']] = json;
					//console.log("userList:");					//console.log(userList[json['uid']]);					
					
					//res.setHeader("Set-Cookie", 'uid='+json['uid']);//fuck expires!
					var exp = new Date(Date.now() + json['expires_in']);
					/*
					res.cookie("uid", json['uid'],
					{
						expires: exp, 		
					});
					*/
					
					
					
					res.writeHead(200,{				
						'Content-Type'	:	'text/html',
						'Set-cookie'    :   'uid='+json['uid']+'; Expires=Wed, 13-Jan-2021 22:23:01 GMT;HttpOnly'
					});
					//redirect
					
					var html = "<script>window.location.href='/weibo'</script>";
					console.log(html);
					res.end(html);
				});
				
				return;
			}
			res.writeHead(200,{'Content-Type':'text/html'});
			var html = "<script>window.location.href='https://api.weibo.com/oauth2/authorize?client_id=3588356401&redirect_uri=http://42.121.108.75/weibo/response&response_type=code'</script>";
			res.end(html);
		}
		
		
	};	
	
	
}).listen(1025,function(err)
{
	console.log("server on /weibo");
});

function getWeiboJson(opts,callback)
{
	var url = "https://api.weibo.com/2/statuses/"+opts.need+".json?access_token="+userList[opts.id].access_token;
	if(opts.max_id)
	{
		url += "&max_id="+opts.max_id;	
	}
	var result = '';
	https.get(url,function(res)
	{
		res.on('data',function(data)
		{
			result += data;
		});
		res.on('end',function()
		{
			
			var result_json = JSON.parse(result).statuses;
			var myresult = JSON.stringify(result_json);
			callback(myresult);
			/*
			for(var key in result_json)
			{
				var resize_retweet_pic	=	"";
				var resize_head_pic		=	"";
				var demo = result_json[key];
				if(demo.retweeted_status)
				{
					if(demo.retweeted_status.original_pic)
					{
						getImg(demo.retweeted_status.original_pic,function(resizeurl){
							result_json[key].resize_retweet_pic = resizeurl;
							getImg(demo.user.avatar_large,function(headresize){
								result_json[key].resize_head_pic = headresize;
								
								{
									result = JSON.stringify(result_json);
								//console.log(result);
									callback(result);
								}
							});
						});
					}	
				}
				/*
				getImg(demo.user.avatar_large,function(resizeurl){
					resize_head_pic = resizeurl;
					result_json[key].resize_head_pic = resizeurl;					
				});
			}
			var myresult = JSON.stringify(result_json);
			myresult = JSON.stringify(myresult);
			
			callback(result);			
			*/
			
		});
	});
}

function getImg(url,callback)
{
	http.get(url,function(res){
		var img = "";
		var name = urlToName(url);
		var path = '../pic/'+name;
		res.setEncoding('binary');
		res.on('data',function(data){
			img += data;
		});
		res.on('end',function(){
			fs.writeFile(path,img,'binary',function(err){
				if(err) throw err;
				resize(name,function(url){
					callback(url);
				});
			});
		});
	});
}

function urlToName(str)
{
	return str.replace(/\//g,'_');
}

function resize(name,callback)
{	
	var Image = canvas.Image;
	var img = new Image;
	var to_path = "../img/"+name;
	img.onload = function(){
		var height	=	100,
			width	=	100 * img.width / img.height;
		if(img.height < 100)//if biande
		{
			height = img.height;
			width  = img.width;
		}
		if(name.indexOf('.jpg') == -1 && img.width == img.height)//head img
		{
			height	=	50;
			width	=	50;
		}
		var	mycanvas=	new canvas(height,width),
			ctx		=	mycanvas.getContext('2d');
		ctx.drawImage(img,0,0,width,height);
		mycanvas.toBuffer(function(err,buf){
			fs.writeFile(to_path,buf,function(){
				callback('42.121.108.75/img/'+name);
			});
		});
	}
	img.src= "../pic/" + name;
}

function writeFile()
{
	var picList = [];
	for(var key in $.pic)
	{
		//console.log(key+":"+$.pic[key])
		for(var _key in $.pic[key])
		{
			picList.push($.pic[key][_key]);
		}
	}
	//console.log("fileList = ");
	//console.log(picList);
	for(var i = 0; i < picList.length;)
	{
		var url = picList[i];
		console.log("url1 = "+url);
		http.get(url,function(res)
		{
			console.log("url2 = "+url);
			var _name = urlToName(url);
			var img = "";
			res.setEncoding('binary');
			res.on('data',function(data)
			{
				img += data;	
			});
			res.on('end',function()
			{
				console.log("url3 = "+url);
				i++;
				//console.log("name = "+_name);
				/*
				fs.writeFile('/home/wwwroot/weibo/pic/'+_name,img,'binary',function(err)
				{
					if(err)	throw err;
					console.log(_name + " saved");
				});
				*/
			})
		})

	}

}

function getWeiboCommentJson(opt,callback)
{
	var url = "https://api.weibo.com/2/comments/show.json?access_token="+userList[opt['uid']].access_token+"&id="+opt['id'];
	var result = '';
	https.get(url,function(res)
	{
		res.on('data',function(data)
		{
			result += data;
		});
		res.on('end',function()
		{
			callback(result);
			console.log(result);
		});
	});
}

function isOldUser(cookie)
{
	if(cookie)
	{
		var arr = cookie.split(';');
		for(var key in arr)
		{
			if(arr[key].indexOf('uid') == 0)
			{
				var uid = arr[key].split('=')[1];
				console.log("get uid = "+uid);
				if(userList[uid])//and exist in userList
				{
					return 1;
				}
				
			}
		}		
	}
	return 0;
}

function getUid(cookie)
{
	if(cookie)
	{
		var arr = cookie.split(';');
		for(var key in arr)
		{
			if(arr[key].indexOf('uid') == 0)
			{
				var uid = arr[key].split('=')[1];
				return uid;				
			}
		}		
	}
	return false;
}

