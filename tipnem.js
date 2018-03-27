$(function() {

	var allAsset;
	var _history;
	var isAccountHistoryDone = false;
	var isNemHistoryDone = false;
	var _nemIncomingHistory = [];
	var _nemOutgoingHistory = [];
	var nemMosaicStatus = {};
	var mosaicList = [];
	var is_deposit = false;
	var is_lottery = false;
	var date_format = function(num) {
		return ( num < 10 ) ? '0' + num  : num;
	};
	var dispTimeStamp = function(timeStamp){

		var NEM_EPOCH = Date.UTC(1970, 2, 29, 0, 6, 25, 0);
		var d = new Date(timeStamp * 1000 );
		var strDate = d.getFullYear()%100
			+ "-" + date_format( d.getMonth() + 1 )
			+ '-' + date_format( d.getDate() )
			+ ' ' + date_format( d.getHours() )
			+ ':' + date_format( d.getMinutes() ) ;
		return 	strDate;
	}

	var dispAmount = function(amount){
		if(amount != 0){
			if(amount < 1000000){

				return "0." + paddingright(amount.toString(),0,6);
			}else{
				var str_amount = amount.toString();
				var r = str_amount.slice(-6);
				var l = str_amount.substring(0,str_amount.length - 6);
				l = l.replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
			}
		}else{
			return "0.000000";
		}
		return l + "." + r;
	}

	var dispAmount2 = function(amount,divisibility){
		if(divisibility > 0){

			if(amount < Math.pow(10, divisibility)){

				return "0." + paddingright(amount.toString(),0,divisibility);
			}else{
				var str_amount = amount.toString();
				var r = str_amount.slice(-divisibility);
				var l = str_amount.substring(0,str_amount.length - divisibility);
				l = l.replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
			}
			return l + "." + r;

		}else{
			l = amount.toString().replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
			return l
		}

	}

//	console.log(dispAmount2(30000000,6));
//	console.log(dispAmount2(300,0));
//	console.log(dispAmount2(50005,1));
//
//	console.log(dispAmount2(0,6));
//	console.log(dispAmount2(0,0));
//	console.log(dispAmount2(0,1));
//
//	console.log(dispAmount2(100,6));
//	console.log(dispAmount2(5,1));


	function paddingright(val,char,n){
		for(; val.length < n; val= char + val);
		return val;
	}

	function getCookie( name )
	{
		var result = "";

		var cookieName = name + '=';
		var allcookies = document.cookie;

		var position = allcookies.indexOf( cookieName );
		if( position != -1 )
		{
			var startIndex = position + cookieName.length;

			var endIndex = allcookies.indexOf( ';', startIndex );
			if( endIndex == -1 )
			{
				endIndex = allcookies.length;
			}

			result = decodeURIComponent(
				allcookies.substring( startIndex, endIndex ) );
		}

		return result;
	}

	twitter ="";
	if (1 < document.location.search.length) {

		var query = document.location.search.substring(1);
		var prms = query.split('&');
		var item = new Object();
		for (var i = 0; i < prms.length; i++) {
			var elm   = prms[i].split('=');
			var idx   = decodeURIComponent(elm[0]);
			var val   = decodeURIComponent(elm[1]);
			item[idx] = decodeURIComponent(val);
		}
		twitter = item["twitter"];
		address = item["address"];
		$("#withdrow_address").val(address);
		$("#withdrow_mono_address").val(address);
	}
	if(twitter == "" || twitter == undefined){

		twitter = getCookie('twitter');

	}
	if(address  == undefined){

		address = "";

	}
	address = address.replace( /-/g , "" ).toUpperCase();
	$("#xembook"  ).attr("href", "/?address=" + address);

	client = new WebSocket(WEB_SOCKET_URL);

	client.onerror = function(ev){console.log('socket error!');};
	client.onclose = function(ev){
		alert("tipnem-botへの接続は切断されています。");
		console.log('socket close!');};
	client.onopen  = function(ev){

		if( twitter == ""){
			twitter = prompt('twitterアカウントを入力してください。PINコードを送信します。',twitter);
		}
		if(twitter.charAt(0) != "@"){

			twitter = "@" + twitter;
		}
		if(twitter != ""){


			var expire_sec = new Date().getTime() + 365 * 24 * 60 * 60 * 1000;
			var expire_date = new Date()
			expire_date.setTime(expire_sec);
			document.cookie = 'twitter=' + encodeURIComponent( twitter ) + "; expires=" + expire_date.toGMTString();

//			sendOfferRequest(twitter);
			sendRequest(client,{"command": "user/offer", "data": {"screen_name":twitter} });


		}
	};
	client.onmessage = function(ev) {

		console.log(ev.data); //dum
		var msg = JSON.parse(ev.data);
		var command = msg["command"];
		var pmsg;
		if(command == "user/offer"){
			var result = msg["result"];
			if(result){
				$('#pincodeModal').modal();
				$('#pincode_title').text(twitter + " にPINコードを送信しました。入力してください");
//				pmsg= twitter + " にPINコードを送信しました。入力してください";
//				var pinNumber = prompt(pmsg);
//				sendRequest(client,{"command": "user/check", "data": {"screen_name":twitter,"pincode":pinNumber} });
			}else{
				if(msg["data"].indexOf('User not found') >= 0){
					pmsg="ツイッターにユーザが存在しません:" + twitter;
					alert(pmsg);

				}else if(msg["data"].indexOf('already created') >= 0){
					$('#pincodeModal').modal();

					$('#pincode_title').text( twitter + " に送信済みのPINコードを入力してください");

//					pmsg= twitter + " に送信済みのPINコードを入力してください";
//					var pinNumber = prompt(pmsg);
//					sendRequest(client,{"command": "user/check", "data": {"screen_name":twitter,"pincode":pinNumber} });

				}else{

					pmsg="エラーが発生しました。tipnemをフォローしているか確認ください:" + msg["data"];
					alert(pmsg);
				}
			}
		}else if (command == "user/upgrade") {

			var result = msg["result"];
			var pmsg;
			if(result){
				$("#pincode_form").val("");
				$('#pincodeModal').modal();
				$('#pincode_title').text(twitter + " にPINコードを送信しました。入力してください");

			}else{
				if(msg["data"].indexOf('require_level must not equal to now_level') >= 0){

					if(is_deposit){
						is_deposit = false;
						$('#sampleModal').modal();

					}else if(is_lottery){
						is_lottery = false;
						$('#lotteryModal').modal();

					}
				}else{

					$("#pincode_form").val("");
					$('#pincodeModal').modal();
					$('#pincode_title').text( twitter + " に送信済みのPINコードを入力してください");

				}

			}

		}else if(command == "user/check"){

			var result = msg["result"];
			var pmsg;
			if(result){
				sendRequest(client,{"command": "nem/history",     "data": {"type":0} });
				sendRequest(client,{"command": "nem/history",     "data": {"type":1} });
				sendRequest(client,{"command": "account/balance", "data": {"dummy":"data"} });
				sendRequest(client,{"command": "nem/get_tag",     "data": {"dummy":"data"} });

			}else{
				alert("認証に失敗しました。");
			}

			if(is_deposit){
				is_deposit = false;
				$('#sampleModal').modal();


			}else if(is_lottery){

				is_lottery = false;
				$('#lotteryModal').modal();

			}


		}else if(command == "nem/get_tag"){

			$("#nem_gettag").val(msg["data"]["tag"]);
			var bill = '{"v":2,"type":2,"data":{"addr":"' + TIPNEM_ADDRESS + '","amount":0,"msg":"' + msg["data"]["tag"] + '"}}';
			$("#depositqr").attr("src","http://chart.apis.google.com/chart?chs=180x180&cht=qr&chl=" + bill);

		}else if(command == "account/balance"){

			$("#account_address"   ).text(twitter );
			allAsset = msg["data"]["all"];
			for (key in allAsset){
				mosaicList.push(key);
			}

			sendRequest(client,{"command": "account/history", "data": {"dummy":"data"} });

		}else if(command == "nem/history"){

			msg["data"].forEach(function(val,index){

				for (key in val["mosaics"]){

					mosaicList.push(key);

				}
//				var mosaic_name = val["mosaic_name"];
//				mosaicList.push(mosaic_name);

				if(msg["data"][0]["type"] == "outgoing"){

					_nemOutgoingHistory = msg["data"];
				}else{
					_nemIncomingHistory = msg["data"];

				}
			});

			isNemHistoryDone = true;
			if(isAccountHistoryDone){
//				var setArray = Array.from(new Set(mosaicList));
				sendRequest(client,{"command": "nem/mosaic/status", "data": mosaicList });
				mosaicList = [];

			}

		}else if(command == "account/history"){

			_history = msg["data"];
//			var mosaicList = [];
			_history.forEach(function(val,index){

				var mosaic_name = val["mosaic_name"];

				console.log(mosaic_name);
				mosaicList.push(mosaic_name);
			});

			isAccountHistoryDone= true;
			if(isNemHistoryDone){
//				var setArray = Array.from(new Set(mosaicList));
				sendRequest(client,{"command": "nem/mosaic/status", "data": mosaicList });
				mosaicList = [];
			}


		}else if(command == "nem/mosaic/status"){

			isAccountHistoryDone = false;
			isNemHistoryDone = false;

			console.log(msg["data"]);
			for (key in msg["data"]){


				var divisibility = msg["data"][key]["properties"]["divisibility"];
				nemMosaicStatus[key] = {}
				nemMosaicStatus[key]["divisibility"] = divisibility;
				nemMosaicStatus[key]["url"] = msg["data"][key]["image"]["url"];
			}


			if(last_command == "transfers_more"){

				last_command = "";
				historyEach();

			}else{



				$( "#mosaic_balance tbody" ).empty();
				$( "#wd_form2" ).empty();
				$( "#wd_form4" ).empty();
				var select_form = "<label class='col-sm-2 control-label'>モザイク</label><div  class='col-sm-10 control-label'><select class='form-control' id='wd_form4_select'>";
				for (key in msg["data"]){

					if(key in allAsset){

						var mosaic_balance = dispAmount2(allAsset[key],nemMosaicStatus[key]["divisibility"]);
						$( "#mosaic_balance tbody" ).append( "<tr>" +
							"<td class='text-left'><a href='#'><a id='mosaic_img' data-name='" + key + "' href='#'><img src='" + nemMosaicStatus[key]["url"] + "' alt='[NoImg]' width='32px'></a> " + key + "</td>" +
							"<td>" + mosaic_balance + "</td>" +
						"</tr>" );

						var repkey = key.replace(":","_");
						repkey = repkey.replace(".","-");
						$( "#wd_form2" ).append( "<div class='form-group'>"
						+ "<label class='col-sm-4 control-label'>" + key + "</label><div class='col-sm-8'><input type='text' value='0' class='form-control' id='wd_" + repkey + "' ></div>"
						+ "</div>" );
						select_form += "<option  id='wd_" + repkey + "'>" + key + "</option>";
					}
				}

				select_form += "</select></div>";

				$( "#wd_form4" ).append( select_form);

				$( "#transfers tbody" ).empty();
				$( "#transfers2_outgoing tbody" ).empty();
				$( "#transfers2_incoming tbody" ).empty();

				_nemOutgoingHistory.forEach(function(val,index){

					var recipient	= val["recipient"];
					var time_stamp	= val["utime"];
					var mosaics  = val["mosaics"];
					var txhash = val["txhash"];
					var htmlMosaics = "";
					for (key in mosaics){

						htmlMosaics += key + " " + dispAmount2(mosaics[key],nemMosaicStatus[key]["divisibility"]) + "<br>";
					}

					$( "#transfers2_outgoing tbody" ).append( "<tr>" +
					"<td><a href='http://chain.nem.ninja/#/search/" + txhash + "' target='_blank'>" + dispTimeStamp(time_stamp) + "</a><br>"

						 + recipient.substring(0,6)  + "...</td>" +
						"<td>" + htmlMosaics + "</td>"
					+ "</tr>" );

				});
				_nemIncomingHistory.forEach(function(val,index){

					var recipient	= val["recipient"];
					var time_stamp	= val["utime"];
					var mosaics  = val["mosaics"];
					var txhash = val["txhash"];

					var htmlMosaics = "";
					for (key in mosaics){
						htmlMosaics += key + " " + dispAmount2(mosaics[key],nemMosaicStatus[key]["divisibility"]) + "<br>";
					}

					$( "#transfers2_incoming tbody" ).append( "<tr>" +
						"<td><a href='http://chain.nem.ninja/#/search/" + txhash + "' target='_blank'>" + dispTimeStamp(time_stamp) + "</a><br>"
						 + recipient  + "</td>" +
						"<td>" + htmlMosaics + "</td>"
					+ "</tr>" );

				});

				historyEach();
			}


		}else if(command == "nem/send/estimate"){

			$( "#wd_form3_all"  ).empty();
			$( "#wd_form3_send" ).empty();
			var all = msg["data"]["all"];
			var sendFee = msg["data"]["fee"]["send"];
			var levyFee = msg["data"]["fee"]["levy"];
			var msgFee = msg["data"]["fee"]["msg"];

			for (key in all){

				var mosaic_balance = dispAmount2(all[key],nemMosaicStatus[key]["divisibility"]);
				$( "#wd_form3_all" ).append( "<tr><td>" + key + "</td><td>" + mosaic_balance + "</td></tr>" );
			}
			for (key in sendFee){
				var mosaic_balance = dispAmount2(sendFee[key],nemMosaicStatus[key]["divisibility"]);
				$( "#wd_form3_send" ).append( "<tr><td>送金手数料</td><td>" + mosaic_balance + "</td></tr>" );
			}
			for (key in levyFee){
				var mosaic_balance = dispAmount2(levyFee[key],nemMosaicStatus[key]["divisibility"]);
				$( "#wd_form3_send" ).append( "<tr><td>徴収</td><td>" + mosaic_balance + "</td></tr>" );
			}
			for (key in msgFee){
				var mosaic_balance = dispAmount2(msgFee[key],nemMosaicStatus[key]["divisibility"]);
				$( "#wd_form3_send" ).append( "<tr><td>メッセージ手数料</td><td>" + mosaic_balance + "</td></tr>" );
			}

		}else if(command == "nem/send"){

			var result = msg["result"];
			var pmsg;
			if(result){
				alert("出金しました");

			}else{
				alert("出金に失敗しました：" + msg["data"]);
			}
		}else if(command == "nem/mosaic/update"){

			var result = msg["result"];

			if(result){
				isAccountHistoryDone = false;
				isNemHistoryDone = false;

				sendRequest(client,{"command": "nem/history",     "data": {"type":0} });
				sendRequest(client,{"command": "nem/history",     "data": {"type":1} });
				sendRequest(client,{"command": "account/balance", "data": {"dummy":"data"} });
				sendRequest(client,{"command": "nem/get_tag",     "data": {"dummy":"data"} });

			}else{
				alert("更新に失敗しました。：" + msg["data"]);
			}

		}else if(command == "account/lottery/setup"){

			var result = msg["result"];

			if(result){
				alert("ねむ抽選を登録しました。DMを確認してください。");
			}else{
				alert("登録に失敗しました。：" + msg["data"]);
			}


		}


	};


	var historyEach = function(){

		_history.forEach(function(val,index){

			var mosaic_name = val["mosaic_name"];
			var recipient	= val["recipient"];
			var sender		= val["sender"];
			var time_stamp	= val["time"];
			var tran_amount  = val["amount"];
			var message  = val["twitter"]["tip"]["text"];
			var checked  = val["checked"];
			var uuid  = val["uuid"];
			var tran_type = "";
			var partner = "";
			last_uuid = uuid;

			if(sender == twitter){
				if(checked){
					tran_type = "<font color='red'>投銭</font>";
				}else{
						tran_type = "<font color='red'><b>投銭(<a id='unconfsend' data-num='" + uuid + "' href='#'>未確</a>)</b></font>";
//					tran_type = "<font color='red'><b>投銭(<a id='unconfsend' onClick='jump(" + uuid + ");' href='#'>未確</a>)</b></font>";
				}
				partner = recipient;
				tran_amount = dispAmount2(tran_amount,nemMosaicStatus[mosaic_name]["divisibility"]);
				tran_amount = "- " + tran_amount.toString();

			}else{
				tran_type = "<font color='green'>受銭</font>";

				if(!checked){
					var param = {
					   "uuid": uuid
					}

					sendRequest(client,{"command": "account/history/check", "data": param });
				}
				partner = sender;
				tran_amount = dispAmount2(tran_amount,nemMosaicStatus[mosaic_name]["divisibility"]);
				tran_amount = "+ " + tran_amount.toString();
			}
			if(message == null){
				message = "";
			}else{
				message = message.substring(0,14);
			}
			$( "#transfers tbody" ).append( "<tr>" +
				"<td>" + dispTimeStamp(time_stamp) + "<br>" +tran_type+ "<br>" + partner + "</td>" +
				"<td>" + mosaic_name + "<br>" + tran_amount + "<br>" + message + "</td>" +

			"</tr>" );
		});


	}


    $(document).on("click","#unconfsend", function() {

		if(confirm("投げ銭をキャンセルします。") ){

			sendRequest(client,{"command": "account/history/delete", "data": {"uuid":$(this).data('num')} });
			$(this).parent().parent().parent().parent().remove();

		}
		return false;
    });

	var clipboard = new Clipboard('#clipboard');
	clipboard.on('success', function(e) {
		e.clearSelection();
		alert("クリップボードにコピーしました。");
	});

	$('#change_twitter').on('click', function (event) {

		twitter = prompt('twitterアカウントを入力してください。PINコードを送信します。',twitter);
		if(twitter.charAt(0) != "@"){

			twitter = "@" + twitter;
		}
		if(twitter != ""){

			var expire_sec = new Date().getTime() + 365 * 24 * 60 * 60 * 1000;
			var expire_date = new Date()
			expire_date.setTime(expire_sec);
			document.cookie = 'twitter=' + encodeURIComponent( twitter ) + "; expires=" + expire_date.toGMTString();

//			document.cookie = 'twitter=' + encodeURIComponent( twitter );
			location.href = "?twitter=" + twitter;
		}
	});


	$('#reload_twitter').on('click', function (event) {

		isAccountHistoryDone = false;
		isNemHistoryDone = false;

		sendRequest(client,{"command": "nem/history",     "data": {"type":0} });
		sendRequest(client,{"command": "nem/history",     "data": {"type":1} });
		sendRequest(client,{"command": "account/balance", "data": {"dummy":"data"} });
		sendRequest(client,{"command": "nem/get_tag",     "data": {"dummy":"data"} });

	});



//	$('#sampleModal').on('show.bs.modal', function (event) {
	$('#button_withdrow').on('click', function (event) {
		is_deposit = true;
		sendRequest(client,{"command": "user/upgrade", "data": {  "require_level": 2} });
	});

	$('#button_mono_withdrow').on('click', function (event) {

		$('#sampleModal').modal('hide');
		$('#sampleModal2').modal();
	});

	$('#button_lottery').on('click', function (event) {
		is_lottery = true;
		sendRequest(client,{"command": "user/upgrade", "data": {  "require_level": 2} });
	});




	var nemSend;
	$("#withdrow_confirm").on("click",function(event){
		sendRequest(client,{"command": "nem/send", "data": nemSend });
	});


	$("#pincode_confirm").on("click",function(event){
		var pinNumber = $("#pincode_form").val();
		sendRequest(client,{"command": "user/check", "data": {"screen_name":twitter,"pincode":pinNumber} });
	});


	$("#mosaic_confirm").on("click",function(event){
		let mosaic_name = $("#mosaic_name").val();
		let mosaic_url = $("#mosaic_url").val();
		let mosaic_sign = 1;
		if($("#mosaic_sign").prop('checked')) {
			mosaic_sign = 2;
		}

		sendRequest(client,{"command": "nem/mosaic/update", "data": {"mosaic_name":mosaic_name,"mosaic_url":mosaic_url,"type": mosaic_sign} });
	});


	$("#withdrow_submit").on("click",function(event){

		if($(event.target).attr("class") == "btn btn-primary"){

			sendMosaics = {};
			for (key in nemMosaicStatus){
				var repkey = key.replace(":", "_");
				repkey = repkey.replace(".", "-");
				var mosaicAmount = $("#wd_" + repkey).val();
				console.log(key);
				console.log(repkey);
				console.log( $("#wd_" + repkey).val());
				if(mosaicAmount > 0){
					sendMosaics[key] = Number(mosaicAmount) * Math.pow(10,nemMosaicStatus[key]["divisibility"]) ;
				}
			}

			var recipient = $("#withdrow_address").val().replace(/-/g,"").toUpperCase();

			nemSend = {
			   "sender": twitter,
			   "recipient": recipient,
			   "mosaics": sendMosaics,
			   "message": "TipNEM 出金"
			}
			sendRequest(client,{"command": "nem/send/estimate", "data": nemSend });

		}else{
			console.log("キャンセル");
		}

	});

	$("#lottery_confirm").on("click",function(event){
console.log(">>>>>>>>>>>>>>>>>>");
		if($(event.target).attr("class") == "btn btn-primary"){

			sendMosaics = {};
			var date = new Date() ;
			var a = date.getTime()  ;
			var unitime = Math.floor( a / 1000 ) + Number($("#finish_time").val()) * 60 * 60;


console.log(nemMosaicStatus);
//prizeList = [$("#prize_name").val(),Number($("#prize_amount").val()) * Math.pow(10,nemMosaicStatus[$("#prize_name").val()]["divisibility"]) , Number($("#prize_count").val())];
prizeList = [];

	for(var i = 0;i<Number($("#prize_count").val());i++){

		prizeList.push(
			[
				$("#prize_name").val(),
				Number($("#prize_amount").val()) * Math.pow(10,nemMosaicStatus[$("#prize_name").val()]["divisibility"]),
				nemMosaicStatus[$("#prize_name").val()]["divisibility"]
			]
		);

	}


		nemSend = {
			   "distribute_order": {
					 "simple_fake_check": false,
					 "deep_fake_check": false,
			      "my_follower": true,
			      "prize": 	prizeList
			   },
			   "original_id": $("#original_id").val(),
			   "finish_time": unitime
			};

console.log(nemSend);
			sendRequest(client,{"command": "account/lottery/setup", "data": nemSend });

		}else{
			console.log("キャンセル");
		}

	});

	$("#withdrow_mono_submit").on("click",function(event){


		var mosaicAmount = $("#withdrow_mono_amount").val();
		var recipient = $("#withdrow_mono_address").val().replace(/-/g,"").toUpperCase();
		var sendMosaics = {};
		var key = $("#wd_form4_select").val();
		sendMosaics[key] = Number(mosaicAmount) * Math.pow(10,nemMosaicStatus[key]["divisibility"]) ;
		nemSend = {
		   "sender": twitter,
		   "recipient": recipient,
		   "mosaics": sendMosaics,
		   "message": "TipNEM 出金"
		}
		sendRequest(client,{"command": "nem/send/estimate", "data": nemSend });


		console.log("==================================");
		console.log(event);
		if($(event.target).attr("class") == "btn btn-primary"){
		}

	});



	$('#transfers_more').click(function(){
		last_command = "transfers_more";
		isNemHistoryDone = true;
		sendRequest(client,{"command": "account/history", "data": {"uuid":last_uuid} });
		return false;
	});


	$(document).on("click","#mosaic_img", function() {

		console.log($(this).children().attr("src"));
//		$('#mosaic_img').attr("src",$(this).children().attr("src"));
		$('#mosaic_img_big').attr("src",$(this).children().attr("src"));
		$('#mosaic_name').val($(this).data('name'));
		$('#mosaic_url').val("");
		$('#mosaicModal').modal();
//		sendRequest(client,{"command": "account/history/delete", "data": {"uuid":$(this).data('num')} });
//		$(this).parent().parent().parent().parent().remove();


	return false;
	});


});

//window.loadの外で宣言する
var client;
var twitter = "";
var address = "";
var last_command = "";


//ソケット送信
function sendRequest(client,param){

	try{
		console.log(JSON.stringify(param));
		client.send(JSON.stringify(param));
	}
	catch (e) {
		console.log("send error " + e);
	}
}
