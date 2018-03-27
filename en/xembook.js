$(function() {

	var ACCOUNT_GET ;
	var ACCOUNT_HARVESTS ;
	var ACCOUNT_TRANSFERS;
	var defaultPort = ":7890";
	var targetNode = "" ;
	var account_meta;

	var getAccountEndpoint = function(address){

	    targetNode =  NODES[Math.floor(Math.random() * NODES.length)] + defaultPort;
	    ACCOUNT_GET        = "http://" + targetNode + "/account/get?address="           + address;
		ACCOUNT_HARVESTS   = "http://" + targetNode + "/account/harvests?address="      + address
		ACCOUNT_TRANSFERS  = "http://" + targetNode + "/account/transfers/all?address=" + address;
		return ACCOUNT_GET;
	}

	var getAccount = function(address){
		var d = $.Deferred();
	    $.ajax({url: getAccountEndpoint(address) ,type: 'GET'}).then(
	        function(res){
	        	d.resolve(res);
	        },
	        function(res){
	            getAccount();
	        }
	    );
		return d.promise();//Deferredをpromiseに変換
	}



	var NODES = Array(
	"alice2.nem.ninja",
	"alice3.nem.ninja",
	"alice4.nem.ninja",
	"alice5.nem.ninja",
	"alice6.nem.ninja",
	"alice7.nem.ninja"
	);

	var POLO_JPY_XEM;
	var ZAIF_JPY_XEM;
	var POLO_USD_XEM
	var last_jpy;
	var last_transfer_id;
	var first_harvests_id;
	var sum_income = 0;
	var sum_outcome = 0;
	var is_last_harvest = true;

	var clipboard = new Clipboard('#clipboard');
	clipboard.on('success', function(e) {
		e.clearSelection();
		alert("copy to clipboad");
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
		var strDate =
			date_format( d.getMonth() + 1 )
			+ '/' + date_format( d.getDate() )
			+ '/' + d.getFullYear()
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

				tran_fee    = tran.otherTrans.fee + tran.fee ;
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

				if(address != tran.recipient){
					sum_outcome += tran_amount + tran.fee;
					tran_type = "<font color='red'>out</font>";
					tran_amount = dispAmount(tran_amount + tran.fee);
					tran_amount = "- " + tran_amount;

				}else{
					sum_income += tran_amount;
					tran_type = "<font color='green'>in</font>";
					tran_amount = dispAmount(tran_amount);
					tran_amount = "+ " + tran_amount.toString();
				}

				$( "#transfers tbody" ).append( "<tr>" +
					"<td>" + dispTimeStamp(tran.timeStamp) + "</td>" +
					"<td>" + tran_type + "</td>" +
					"<td class='text-right'><a target='_blank' href='http://chain.nem.ninja/#/search/" + meta_hash + "'>" + tran_amount + "</a></td>" +
				"</tr>" );

				$("#sum_income" ).text(dispAmount(sum_income ) + "XEM");
				$("#sum_outcome").text(dispAmount(sum_outcome) + "XEM");
			}

			cnt++;
			if(mcnt <= cnt){
				return true;
			}

		});
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
			$( "#harvests tbody" ).append( "<tr><td>[status]</td><td>INACTIVE</td></tr>" );

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
	var lc = "";
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
		lc = item["lc"].toUpperCase();
	}
console.log(address);
	if( !address ){
		var proaddress = prompt('input your NEM address',address);
		proaddress = proaddress.replace( /-/g , "" ).toUpperCase();
		location.href = "http://xembook.net/en/?address=" + proaddress + "&lc=" + lc ;
	}
	address = address.replace( /-/g , "" ).toUpperCase();

	if(lc == ""){
		lc = "USD";
	}
	getAccount(address).then(function(result){

		getHarvests(10);
		getTransfers(10);

		var account = result.account;
		account_meta    = result.meta;
		account_balance = account.balance;
		account_balance = 	account_balance.toString();
		if(account_balance != "0"){
			account_balance = dispAmount(account_balance);
		}
		var account_importance = account.importance * 100000000;
		account_importance = Math.round( account_importance );
		account_importance /= 10000;

		$.when(
			$.ajax({url: "https://poloniex.com/public?command=returnTicker" ,type: 'GET'}),
			$.ajax({url: "https://blockchain.info/ticker?cors=true"         ,type: 'GET'})
		)
		.done(function(res1, res2) {

			last_lc = 0;
			last_lc_xem = res1[0].BTC_XEM.last;
			if(lc == "AUD"){
				last_lc = res2[0].USD.last;
			}else if(lc == "AUD"){
				last_lc = res2[0].AUD.last;
			}else if(lc == "BRL"){
				last_lc = res2[0].BRL.last;
			}else if(lc == "CAD"){
				last_lc = res2[0].CAD.last;
			}else if(lc == "CHF"){
				last_lc = res2[0].CHF.last;
			}else if(lc == "CLP"){
				last_lc = res2[0].CLP.last;
			}else if(lc == "CNY"){
				last_lc = res2[0].CNY.last;
			}else if(lc == "DKK"){
				last_lc = res2[0].DKK.last;
			}else if(lc == "EUR"){
				last_lc = res2[0].EUR.last;
			}else if(lc == "GBP"){
				last_lc = res2[0].GBP.last;
			}else if(lc == "HKD"){
				last_lc = res2[0].HKD.last;
			}else if(lc == "INR"){
				last_lc = res2[0].INR.last;
			}else if(lc == "ISK"){
				last_lc = res2[0].ISK.last;
			}else if(lc == "JPY"){
				last_lc = res2[0].JPY.last;
			}else if(lc == "KRW"){
				last_lc = res2[0].KRW.last;
			}else if(lc == "NZD"){
				last_lc = res2[0].NZD.last;
			}else if(lc == "PLN"){
				last_lc = res2[0].PLN.last;
			}else if(lc == "RUB"){
				last_lc = res2[0].RUB.last;
			}else if(lc == "SEK"){
				last_lc = res2[0].SEK.last;
			}else if(lc == "SGD"){
				last_lc = res2[0].SGD.last;
			}else if(lc == "THB"){
				last_lc = res2[0].THB.last;
			}else if(lc == "TWD"){
				last_lc = res2[0].TWD.last;
			}else{
				last_lc = res2[0].USD.last;
				lc = "USD";
			}



			POLO_LC_XEM = last_lc_xem * last_lc;

			var polo_price = account.balance / 1000000 * POLO_LC_XEM;
			polo_price = String(Math.round(polo_price)).replace( /(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
			POLO_LC_XEM = Math.round(POLO_LC_XEM * 1000) / 1000;
			$("#polo_price").text(polo_price + lc +" (" + POLO_LC_XEM + lc + "/XEM rate)");
			$("#polo_lastprice").text( POLO_LC_XEM + " "+ lc + "/XEM");

			checkPrice();

		})
		.fail(function(xhr, textStatus, errorThrown) {
			alert("fail for getting lastprice.");
		});

		$("#full_address").val(address);
		$("#account_balance"    ).text(account_balance + "XEM");
		$("#account_importance" ).text(account_importance);
		$("#account_importance2").text(account_importance);
//		$("#tipnem"          ).attr("href", "tipnem.html?address=" + address);
//		$("#xemtax"          ).attr("href", "xemtax.html?address=" + address);
//		$("#xemmessage"      ).attr("href", "xemmessage.html?address=" + address);
//		$("#xemomikuji"      ).attr("href", "xemomikuji.html?address=" + address);
//		$("#nemgallery"      ).attr("href", "nemgallery.html?address=" + address);
		$("#xemreceiver"     ).attr("href", "xemreceiver2.html?address=" + address + "&lc=" + lc);
//		$("#xemprice"        ).attr("href", "xemprice2.html?address=" + address);
		$("#openapostille"   ).attr("href", "https://www.openapostille.net/owner/" + address);
//		$("#transfers_nembex").attr("href", "http://chain.nem.ninja/#/search/" + address);
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
//			var CC_JPY_XEM = res.coincheck;
			var BITTREX_LC_XEM = res.bittrex * last_lc ;

//
//
//			CC_JPY_XEM = Math.round(CC_JPY_XEM * 1000) / 1000;
			BITTREX_LC_XEM = Math.round(BITTREX_LC_XEM * 1000) / 1000;
//			$("#coincheck_lastprice").text( CC_JPY_XEM + " USD/XEM");
			$("#bittrex_lastprice").text( BITTREX_LC_XEM + " "+lc+"/XEM");
		});
	}
//
	setInterval(function(){	checkPrice();},15000);

	$('#harvests_more' ).click(function(){ getHarvests(25);return false;});
	$('#transfers_more').click(function(){getTransfers(25);return false;});

});
