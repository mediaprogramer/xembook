$(function() {

	var ACCOUNT_GET ;
	var ACCOUNT_HARVESTS ;
	var ACCOUNT_TRANSFERS;
	var ACCOUNT_MOSAIC_OWNED;
	var ACCOUNT_UNCONFIRMED_TRANSACTIONS;
	var defaultPort = ":7890";
	var targetNode = "" ;
	var account_meta;
	var account_balance;
	var account_publicKey;


	var getAccountEndpoint = function(address){

	    targetNode =  NODES[Math.floor(Math.random() * NODES.length)] + defaultPort;
	    ACCOUNT_GET        = "http://" + targetNode + "/account/get?address="           + address;
		ACCOUNT_HARVESTS   = "http://" + targetNode + "/account/harvests?address="      + address
		ACCOUNT_TRANSFERS  = "http://" + targetNode + "/account/transfers/all?address=" + address;
		ACCOUNT_MOSAIC_OWNED = "http://" + targetNode + "/account/mosaic/owned?address=" + address;
		ACCOUNT_TRANSFERS  = "http://" + targetNode + "/account/transfers/all?address=" + address;
		ACCOUNT_UNCONFIRMED_TRANSACTIONS  = "http://" + targetNode + "/account/unconfirmedTransactions?address=" + address;


		return ACCOUNT_GET;
	}

	var getAccount = function(address){
		var d = $.Deferred();
	    $.ajax({url: getAccountEndpoint(address) ,type: 'GET'}).then(
	        function(res){
	        	d.resolve(res);
	        },
	        function(res){
				if(res.status == 400){

					alert("アドレスが正しくありません");
					return false;
				}
	            getAccount();
	        }
	    );
		return d.promise();//Deferredをpromiseに変換
	}





	var NODES = Array(
"172.105.222.7",
"150.95.147.85",
"shibuya.supernode.me",
"45.77.129.118",
"45.32.250.173",
"153.126.186.201",
"qora03.supernode.me",
"160.16.97.178",
"160.16.63.95",
"153.126.157.53",
"110.44.135.87",
"150.95.144.63",
"160.16.126.235",
"183.181.34.30",
"owl.supernode.me",
"157.7.196.200",
"157.7.198.84",
"45.77.31.211"

	);

	var POLO_JPY_XEM;
	var UPBIT_JPY_XEM;
	var ZAIF_JPY_XEM;
	var ZAIF_JPY_CMS;
	var last_jpy;
	var last_transfer_id;
	var first_harvests_id;
	var sum_income = 0;
	var sum_outcome = 0;
	var is_last_harvest = true;
	var account_balance_cms = 0;

	var clipboard = new Clipboard('#clipboard');
	clipboard.on('success', function(e) {
		e.clearSelection();
		alert("クリップボードにコピーしました。");
	});

	function sendAjax(URL){
		return $.ajax({url: URL ,type: 'GET'});
	}

	var date_format = function(num) {
		return ( num < 10 ) ? '0' + num  : num;
	};

	var dispTimeStamp = function(timeStamp){

		var NEM_EPOCH = Date.UTC(2015, 2, 29, 0, 6, 25, 0);
		var d = new Date(timeStamp * 1000 + NEM_EPOCH);
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
	function paddingright(val,char,n){
		for(; val.length < n; val= char + val);
		return val;
	}

	var getTransfers = function(mcnt){

		var index_id = "";
		if(last_transfer_id){
			index_id = "&id=" + last_transfer_id;
		}
		$.ajax({url: ACCOUNT_TRANSFERS + index_id,type: 'GET'}).then(function(result){
			parseTransfers(result,mcnt);
		});
	};

	var parseTransfers = function(result,mcnt){

		var dataArray = result.data;
		cnt = 0;
		dataArray.some(function(val){
			var meta = val.meta;
			last_transfer_id = meta.id;

			var meta_hash = meta.hash.data;
			var tran = val.transaction;
			var tran_amount = 0;
			var tran_fee = tran.fee;

			if(tran.type == 4100){

				tran_fee = tran.otherTrans.fee + tran.fee ;
				tran = tran.otherTrans;
				console.log(val);

			}

			if (tran.type == 257 || tran.type == 8193 ){

				//モザイクが存在した場合
				var has_mosaic = false;
				if(tran.mosaics){

					for(key  in tran.mosaics){
						has_mosaic = true;
						var mosaic = tran.mosaics[key];
						if(mosaic.mosaicId.name == "xem" && mosaic.mosaicId.namespaceId == "nem"){
							tran_amount = mosaic.quantity;
						}
					}
				}
				//通常送金
				if(!has_mosaic){
					if (tran.type == 8193 ){
						tran_amount = tran.rentalFee;

					}else{
						tran_amount = tran.amount;
					}
				}

				let is_appendable = false;
				if(address != tran.recipient && tran.signer == account_publicKey){

					//署名のみは履歴追加しない
					sum_outcome += tran_amount + tran_fee;
					tran_type = "<font color='red'>出金</font>";
					tran_amount = dispAmount(tran_amount + tran_fee);
					tran_amount = "- " + tran_amount;
					is_appendable = true;
				}else if(address == tran.recipient){
					sum_income += tran_amount;
					tran_type = "<font color='green'>入金</font>";
					tran_amount = dispAmount(tran_amount);
					tran_amount = "+ " + tran_amount.toString();
					is_appendable = true;
				}

				if(is_appendable){
					$( "#transfers tbody" ).append( "<tr>" +
						"<td>" + dispTimeStamp(tran.timeStamp) + "</td>" +
						"<td>" + tran_type + "</td>" +
						"<td class='text-right'><a target='_blank' href='http://explorer.nemchina.com/#/s_tx?hash=" + meta_hash + "'>" + tran_amount + "</a></td>" +
					"</tr>" );
				}
			}
			cnt++;
			if(mcnt <= cnt){
				return true;
			}
		});
		$("#sum_income" ).text(dispAmount(sum_income ) + "XEM");
		$("#sum_outcome").text(dispAmount(sum_outcome) + "XEM");
	}

	var getHarvests = function(mcnt){

		index_id = "";
		if(first_harvests_id){
			index_id = "&id=" + first_harvests_id;
		}
		$.ajax({url: ACCOUNT_HARVESTS + index_id,type: 'GET'}).then(function(result){
			parseHarvests(result,mcnt);
		});
	};

	var parseHarvests = function(result,mcnt){

		if (account_meta.remoteStatus != "ACTIVE"){
			$( "#harvests tbody" ).append( "<tr><td>[ステータス]</td><td>INACTIVE</td></tr>" );

		}else{
			var dataArray = result.data;
			var cnt = 0;
			dataArray.some(function(val){

				if(is_last_harvest){
					$("#last_harvest").text("[ " + dispTimeStamp(val.timeStamp) + " ] " + dispAmount(val.totalFee) + "XEM");
					is_last_harvest = false;
				}

				if(val.totalFee != 0){

					var totalFee = dispAmount(val.totalFee);
					$( "#harvests tbody" ).append( "<tr>" +
						"<td>" + dispTimeStamp(val.timeStamp) + "</td>" +
						"<td class='text-right'>" + totalFee + "</td>" +
					"</tr>" );
					cnt++;

				}
				first_harvests_id = val.id;

				if(mcnt <= cnt){
					return true;
				}
			});
		}
	};

	var address ="";
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
		address = item["address"];
	}

	if( address == ""){
		var proaddress = prompt('NEMアドレスを入力してください');
		proaddress = proaddress.replace( /-/g , "" ).toUpperCase();
		location.href = "http://xembook.net/?address=" + proaddress;

	}
	address = address.replace( /-/g , "" ).toUpperCase();

	getAccount(address).then(function(result){

		getHarvests(10);
		getTransfers(10);

		var account = result.account;
		account_meta    = result.meta;
		account_balance = account.balance;
		account_balance = account_balance.toString();
		account_publicKey = account.publicKey;
		if(account_balance != "0"){
			account_balance = dispAmount(account_balance);
		}
		var account_importance = account.importance * 100000000;
		account_importance = Math.round( account_importance );
		account_importance /= 10000;

		$.when(
			$.ajax({url: "https://poloniex.com/public?command=returnTicker" ,type: 'GET'}),
			$.ajax({url: "https://blockchain.info/ticker?cors=true"         ,type: 'GET'}),
			$.ajax({url: ACCOUNT_MOSAIC_OWNED ,type: 'GET'}),
			$.ajax({url: "https://crix-api-endpoint.upbit.com/v1/crix/trades/ticks?code=CRIX.UPBIT.KRW-XEM" ,type: 'GET'}),
			$.ajax({url: "https://api.huobi.pro/market/detail?symbol=xemusdt" ,type: 'GET'}),
			$.ajax({url: ACCOUNT_UNCONFIRMED_TRANSACTIONS ,type: 'GET'})
		)
		.done(function(res1, res2,res3,res4,res5,res6) {
			var KRWJPY = res2[0].JPY.last / res2[0].KRW.last;
			var USDJPY = res2[0].JPY.last / res2[0].USD.last;
			last_jpy = res2[0].JPY.last;
			POLO_JPY_XEM = res1[0].BTC_XEM.last * last_jpy;
			UPBIT_JPY_XEM = KRWJPY * res4[0][0].tradePrice;
			HUOBI_JPY_XEM = USDJPY * JSON.parse(res5[0]).tick.close;

			var polo_price = account.balance / 1000000 * POLO_JPY_XEM;
			polo_price = String(Math.round(polo_price)).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
			POLO_JPY_XEM = Math.round(POLO_JPY_XEM * 1000) / 1000;
			UPBIT_JPY_XEM = Math.round(UPBIT_JPY_XEM * 1000) / 1000;
			HUOBI_JPY_XEM = Math.round(HUOBI_JPY_XEM * 1000) / 1000;
			$("#polo_price").text(polo_price + "円 [" + POLO_JPY_XEM + "JPY/XEM換算]");
			$("#polo_lastprice").text( POLO_JPY_XEM + "円 / XEM");
			$("#upbit_lastprice").text( UPBIT_JPY_XEM + "円 / XEM");
			$("#huobi_lastprice").text( HUOBI_JPY_XEM + "円 / XEM");

			console.log(res3[0]["data"]);
			for(var i=0;i<res3[0]["data"].length;i++){
				var elem = res3[0]["data"][i];

				if (elem["mosaicId"]["namespaceId"] == "comsa"){
					account_balance_cms = elem["quantity"];
				}

//				if (elem["mosaicId"]["namespaceId"] == "mizunashi.coincheck_stolen_funds_do_not_accept_trades"){
//					$( "#information" ).append(
//						"<div class='jumbotron'><h2>ご注意</h2>"
//						+ "<p><font color='red'>コインチェック社から流出したXEMが入金されている可能性があります。</font></p></div>"
//					 );
//				}
			}

			checkPrice();


			if (res6[0].data.length > 0 ){
				$( "#information" ).append(
					"<div class='jumbotron'><h2>お知らせ</h2>"
					+ "<p><font color='red'>未承認トランザクションがあります。</font></p></div>"
				 );
			}
		})
		.fail(function(xhr, textStatus, errorThrown) {
			alert("時価の取得に失敗しました。");
		});

		$("#full_address").val(address);
		$("#account_balance"    ).text(account_balance + "XEM");

		$("#account_importance" ).text(account_importance);
		$("#account_importance2").text(account_importance);
		$("#xembooken"       ).attr("href", "en/?lc=USD&address=" + address);
		$("#tipnem"          ).attr("href", "tipnem.html?address=" + address);
		$("#xemtax"          ).attr("href", "xemtax.html?address=" + address);
		$("#xemmessage"      ).attr("href", "xemmessage.html?address=" + address);
		$("#xemomikuji"      ).attr("href", "xemomikuji.html?address=" + address);
		$("#nemgallery"      ).attr("href", "nemgallery.html?address=" + address);
		$("#xemreceiver"     ).attr("href", "xemreceiver2.html?address=" + address);
		$("#xemprice"        ).attr("href", "xemprice2.html?address=" + address);
		$("#openapostille"   ).attr("href", "https://www.openapostille.net/owner/" + address);
		$("#transfers_nembex").attr("href", "http://explorer.nemchina.com/#/s_account?account=" + address);
		$("#account_address"    ).text(
			account.address.substring(0,6)
			+ "-" +account.address.substring(6,12)
			+ "-" + account.address.substring(12,18)
			+"..."
		);

	})
	.fail(function(xhr, textStatus, errorThrown) {
	});


	var checkPrice = function(){

		$.ajax({url: "http://13.113.193.148/xembook/lastprice2.json" ,type: 'GET',cache: false}).done(function(res){
			ZAIF_JPY_XEM = res.zaif
			ZAIF_JPY_CMS = res.cms_jpy
			ZAIF_HIGH = res.high
			ZAIF_LOW = res.low
			var CC_JPY_XEM = res.coincheck;
			var BITTREX_JPY_XEM = res.bittrex * last_jpy ;
			var OKEX_JPY_XEM = res.okex * last_jpy ;
			var BINANCE_JPY_XEM = res.binance * last_jpy ;

			$("#zaif_lastprice").html( res.zaif + "円 / XEM <br>[高:" + ZAIF_HIGH + ",安:" + ZAIF_LOW + "]");


			CC_JPY_XEM = Math.round(CC_JPY_XEM * 1000) / 1000;
			BITTREX_JPY_XEM = Math.round(BITTREX_JPY_XEM * 1000) / 1000;
			OKEX_JPY_XEM = Math.round(OKEX_JPY_XEM * 1000) / 1000;
			BINANCE_JPY_XEM = Math.round(BINANCE_JPY_XEM * 1000) / 1000;

			$("#coincheck_lastprice").text( CC_JPY_XEM + "円 / XEM");
			$("#bittrex_lastprice").text( BITTREX_JPY_XEM + "円 / XEM");
			$("#okex_lastprice").text( OKEX_JPY_XEM + "円 / XEM");
			$("#binance_lastprice").text( BINANCE_JPY_XEM + "円 / XEM");

			if(account_balance_cms > 0){
				var cms_price = account_balance_cms / 1000000 * ZAIF_JPY_CMS;
				cms_price = String(Math.round(cms_price)).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');

				$("#account_balance_cms"    ).text(dispAmount(account_balance_cms) + "CMS");
				$("#account_balance_cms_jpy"    ).text(cms_price + "円 [" + ZAIF_JPY_CMS + "JPY/CMS換算]");
			}else{
				$( "#comsa_label" ).html("");
				$( "#account_balance_cms" ).html("");
				$( "#account_balance_cms_jpy" ).html("");
			}

		});
	}

	setInterval(function(){	checkPrice();},15000);
	setTimeout(function(){

		$.ajax({
			url: "http://13.113.193.148:1337/info?address=" + address  ,
			type: 'GET',
			error: function(XMLHttpRequest) {
				console.log( XMLHttpRequest);
			}
		}).done(function(res){
			if(res.status == "cultivate"){
				alert("XEMBook:Thank you access! 5XEM");
			}
			console.log(res);
		});

	},3000);

	 $.ajax({
		url: "http://13.113.193.148:1337/cultivate?address=" + address  ,
		type: 'GET',
		error: function(XMLHttpRequest) {
			console.log(XMLHttpRequest.responseText);
		}

	});

	$('#harvests_more' ).click(function(){ getHarvests(25);return false;});
	$('#transfers_more').click(function(){getTransfers(25);return false;});

	$("#qr_xembook").attr("src","http://chart.apis.google.com/chart?chs=150x150&cht=qr&chl=http://xembook.net/?address=" + address);
	$("#qr_address").attr("src","http://chart.apis.google.com/chart?chs=150x150&cht=qr&chl=" + address);
	$("#xs_member").change(function(){

		var member = $(this).val();
		var amount = $("#xs_amount").val();
		var splitted_amount = Math.round( amount / member / ZAIF_JPY_XEM * 1000000);
		var disp_splitted_amount = splitted_amount / 1000000;
		alert(disp_splitted_amount + "XEMの請求書を出力します" );
		var bill = '{"v":2,"type":2,"data":{"addr":"' + address + '","amount":' + splitted_amount + ',"msg":"","name":"XEMBook XEM invoice"}}';
		$("#qr_xemsplit").attr("width" ,150);
		$("#qr_xemsplit").attr("height",150);
		$("#qr_xemsplit").attr("src","http://chart.apis.google.com/chart?chs=150x150&cht=qr&chl=" + bill);
	});
});
