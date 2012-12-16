var fs = require('fs');
var canvas = require('canvas');
var Image = canvas.Image;

var img = new Image;

img.onload = function(){
	console.log("success onload");
	var width	=	img.width / 2,
		height	=	img.height / 2,
		mycanvas=	new canvas(width,height),
		ctx		=	mycanvas.getContext('2d');
	ctx.drawImage(img,0,0,width,height);
	mycanvas.toBuffer(function(err,buf){
		fs.writeFile('../pic/testtest.pic',buf,function(){
			console.log("resize success");
		});
	});
}

img.src = "../pic/test.jpg";
console.log(img);
