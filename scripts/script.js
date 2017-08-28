const transApp = {}; //30k char/month for Yandex
const yanDexKey = "trnsl.1.1.20170822T190320Z.6547de93044b96a6.4e3cdb473fb412e5a2f59ec5fe5c1b1b8caae795";
const swapLan = `<a id="swapwiki" onclick="transApp.changeWikiLangListener()"><i id="swapwiki" class="fa fa-language fa-2x" aria-hidden="true"></i></a>`;
const randomLan = `<a id="randomLang" onclick="transApp.randomWord()"><i id="swapwiki" class="fa fa-random fa-lg" aria-hidden="true"></i></a>`

transApp.init = function() {
	$("#loadMoreBtn").hide();
	transApp.buttonListener();
	transApp.languageListener();
	transApp.autoCompleteListener();
	transApp.textAreaSupportListener();
}
let inputWord,fromLanguage,toLanguage,translatedTEXT;//for translation and domain
let articleSum, queryRange = 0; // data from serachResult[i]
let articleId,articleTitle,articleSize,articleSnippet,articleWordcount,articleTimestamp;
//holder for previous typed input
let preToLang, preFromLang, preSearchVal, detectLang="";
let flag;//flag check if no more results
let checker = false;
//yandex ajax call
transApp.callTranslate = function() {
	transApp.translateQ = $.ajax({
		url:`https://translate.yandex.net/api/v1.5/tr.json/translate?key=${yanDexKey}&text=${inputWord}&lang=${fromLanguage}-${toLanguage}`,
		dataType: "json"
	});
	$.when(transApp.translateQ).then(function(res){
		translatedTEXT = res.text[0];
		$("#translatedText").val(translatedTEXT);
	}).fail(function(err){
		console.log("Ajax call failed due: " + err);
	});
}
/* main ajax call to get query from wiki */
transApp.callWikipedia = function(){
	//have to find page id then serach thumbnail
	transApp.searchQ = $.ajax({
		url: `https://${fromLanguage}.wikipedia.org/w/api.php`,
		data: {
			format: "json",
			action: "query",
			list: "search",
			srsearch: inputWord,
			sroffset: queryRange //deafult 0 to 10 load per call
		},
		dataType: "jsonp"
	});
	$.when(transApp.searchQ).then(function(res){
		serachResult = res.query.search;
		articleSum = res.query.searchinfo.totalhits;
		$("#totalArticle").append(randomLan);
		if (serachResult.length === 0){
			$("#totalArticle").append("Sorry, no article about this ...");
			$("#totalArticle").css("padding","20px 0");
			$("#loadMoreBtn").hide();
			return;
		} else {
			$("#totalArticle").append(`There are total of <span class="searchmatch">${articleSum}</span> related articles`);
			$("#totalArticle").append(swapLan);
			$("#totalArticle").css("padding","20px 0");
		};
		let promiseHolder = [];
		flag = res.continue;
		if (res.continue){//if still can load more
			queryRange = res.continue.sroffset;
		}
		for (let i = 0; i<serachResult.length; i ++){
			articleId = serachResult[i].pageid;
			articleTitle = serachResult[i].title;
			articleSize = serachResult[i].size;
			articleSnippet = serachResult[i].snippet;
			articleWordcount = serachResult[i].wordcount;
			//needs to convert readable dates
			articleTimestamp = serachResult[i].timestamp.slice(0, 10);
			//push to array for checking page title and ID
			promiseHolder.push(transApp.callImage(articleTitle));
			transApp.addResultsCardDom();
		}
		/** gathering thumbnail image and add to DOM 
		* promises from ajax return [{}], spread all object to {}, {}....for $when */
		$.when(...promiseHolder).then((...args) => {
			//then rest conactenated to an array [{}, success, promise]
			args = args.map(data => data[0]);
			if (args[0]){ // for each array which is actually an object in args
				args.forEach((dataQuery) => {// array[0].query === parent level of the info
					let imageQuery = dataQuery.query.pages;
					// obj.Object.keys(obj)[0] targeting the first element inside an obj
					let imageSrcInfo = imageQuery[Object.keys(imageQuery)[0]];//src always at 0
					if (imageSrcInfo.pageid){
						var imageID = imageSrcInfo.pageid;//targeting the image ID, which is id for img markup
					}
					if (imageSrcInfo.thumbnail){
						var imageSrc = imageSrcInfo.thumbnail.source;
					}// changing src witch id
					$(`#${imageID}`).attr("src", imageSrc);
				});
			};//end of error if check
		});//end of promiseHolder
	})//end of wiki ajax call
	.fail(function(err){
		console.log("Ajax call failed due: " + err);
	});
}
//helper function for callWiki
transApp.addResultsCardDom = function(){
	//dynamically creating card DOM
	let cardTitle = $("<h2>").append(`<a href = "https://${fromLanguage}.wikipedia.org/wiki/${articleTitle}">${articleTitle}</a>`);
	let cardImage = `<div class="imgHolder"><img id=${articleId} src="./assets/wikipedia_default.png"></div>`;
	let cardContent = `<p>${articleSnippet}<span class="redirect">...</span></p>`;
	let cardInfo = `<p>Size: ${articleWordcount} total words, ${articleSize} bytes</p>`;
	let cardTime = `<p>Last modified: ${articleTimestamp}</p>`;
	let articleExtra = $('<div class="articleExtrainfo">').append(cardInfo,cardTime);
	let resultInfoWrapper = $('<div class="resultInfoLeft">').append(cardTitle,cardContent, articleExtra);
	let cardWrapper = $('<div class="resultCards">').attr('id', `page${articleId}`).append(resultInfoWrapper,cardImage);
	$("#resultWrapper").append(cardWrapper);
}
//helper function for retrive thumbnail
transApp.callImage = function(foo){
	return $.ajax({
	url: `https://${fromLanguage}.wikipedia.org/w/api.php?action=query&titles=${foo}&prop=pageimages&format=json&pithumbsize=400/`,
	dataType : 'jsonp',
	}).fail(function(err){
		console.log("Ajax call failed due: " + err);
	});
}
//helper function for recalling
transApp.searchAndTrans = function(){
	checker = true;
	fromLanguage = $("#textFrom").find(':selected').val();
	toLanguage = $("#textTo").find(':selected').val();
	inputWord = $("#actualText").val();
	// if changes in language, same/diff serach word, empty query 
	if (preSearchVal != inputWord || preSearchVal === inputWord || (preToLang != toLanguage) || (preFromLang != fromLanguage)){
		$("#resultWrapper").empty();
		$("#totalArticle").empty();
		queryRange = 0;//clear range
	}//regex checks white spaces/tab
	if (/^\s+$/.test(inputWord) === false){
		preSearchVal = inputWord;
		preToLang = toLanguage;
		preFromLang = fromLanguage;
		//init
		transApp.callWikipedia();
		transApp.changeDomStyle();
		transApp.callTranslate();
		$("#loadMoreBtn").show();
	}
}
//triger wiki calls
transApp.buttonListener = function(){
	$("#submitSearch").submit(function(e){
		e.preventDefault();
		transApp.searchAndTrans();
		flag = true;
	});
	$("#loadMoreBtn").click(function(e){
		e.preventDefault();
		if (flag === undefined){
			alert("Sorry, no more result");
			return;
		}else{
			$("#totalArticle").empty();
			transApp.callWikipedia();
			transApp.changeDomStyle();
		}
	});
}
//changing lang selected option
transApp.languageListener = function(){
	//language form
	fromLanguage = $("#textFrom").find(':selected').val();
	toLanguage = $("#textTo").find(':selected').val();
	$('#textFrom').change(function(){
		fromLanguage = ($(this).find(':selected').val());
	});
	$('#textTo').change(function(){
		toLanguage = ($(this).find(':selected').val());
		//call again
	});
}
//every keypress will be an api call to get hint array
transApp.autoCompleteListener = function() {
	$("#actualText").keyup(function(event){
		//let typedText = this.value;
		inputWord = "";
		inputWord = $("#actualText").val();
		// if entered, search, ignore tabs by checking whitespace
		if(event.keyCode == 13 && (/^\s+$/.test(inputWord) === false)){
			event.preventDefault();
			transApp.searchAndTrans();
		}
	});
	$("#actualText").autocomplete({
		source: function(request, response) {
			$.ajax({
				url: `https://${fromLanguage}.wikipedia.org/w/api.php`,
				data: {
					format: "json",
					action: "opensearch",
					list: "search",
					search: inputWord
				},
				dataType: "jsonp"
			}).then(function(res){
				response(res[1]);//open serach suggestion array
			});
		}
	});
}
/* text area funcitonallities */
transApp.autoDetect = function(){
	transApp.translateQ = $.ajax({
		url:`https://translate.yandex.net/api/v1.5/tr.json/detect?key=${yanDexKey}&text=${inputWord}`,
		dataType: "json"
	});
	$.when(transApp.translateQ).then(function(res){
		detectLang = res.lang;
		$(`#textFrom option[value=${detectLang}]`).prop('selected', true);
	}).fail(function(err){
		console.log("Ajax call failed due: " + err);
	});
}
//event listener for user input area
transApp.textAreaSupportListener = function(){
	$("#autodetect").click(function(e){
		e.preventDefault();
		if (inputWord){
			transApp.autoDetect();
		}
	});
	$("#autoswap").click(function(e){
		e.preventDefault();
		transApp.swapHelper();
	});
}
//swapping varibles
transApp.swapHelper = function (){
	if (translatedTEXT!== undefined && inputWord){
	// translatedTEXT = $("#translatedText").val();// inputWord = $("#actualText").val();
		let tempFrom = fromLanguage;
		let tempTo = toLanguage;
		let tempInput = inputWord;
		let tempTrans = translatedTEXT;
		$(`#textFrom option[value=${tempTo}]`).prop('selected', true);
		$(`#textTo option[value=${tempFrom}]`).prop('selected', true);
		toLanguage = tempFrom;
		fromLanguage = tempTo;
		$("#actualText").val(tempTrans);
		$("#translatedText").val(tempInput);
		inputWord = tempTrans;
		translatedTEXT = tempInput;
	}
}
//triger in DOM @const
transApp.changeWikiLangListener = function(){
	transApp.swapHelper();
	transApp.searchAndTrans();
}
//modify css
transApp.changeDomStyle = function(){
	$("h1").css("display","none");
	$("header").css("animation", "0s");
	transApp.responsiveHeader();
}
//randomize a world(article) from wiki
transApp.randomWord = function(){
	transApp.random = $.ajax({
		url: `https://${fromLanguage}.wikipedia.org/w/api.php`,
		data: {
			format: "json",
			action: "query",
			generator: "random",
			grnnamespace: 0, //ignore user talks
			grnlimit: 1
		},
		dataType: "jsonp"
	});
	$.when(transApp.random).then(function(res){
		let randomQuery = res.query.pages;
		let randomTitle = randomQuery[Object.keys(randomQuery)[0]].title;
		inputWord = randomTitle;
		$("#actualText").val(inputWord);
		transApp.searchAndTrans();
	}).fail(function(err){
		console.log("Ajax call failed due: " + err);
	});
}

transApp.responsiveHeader = function(){
	if ($(window).width() < 619) {
		$("header").css("height","320px");
	} else {
		$("header").css("height","280px");
	};
}

$(function(){
	transApp.init();
	//responsive for header after serached
	window.onresize = function(){
		if (checker){
			transApp.responsiveHeader();
		}
	}
});