'use strict';

let fs = require('fs');
let Twitter = require('twitter');
let config = require('./config.js');

/**
 * Keys has four items.
 * consumer_key
 * consumer_secret
 * access_token_key
 * access_token_secret
 */
var client = new Twitter(config.Keys);

let tweet = (text) => {
	// There is no error handling...
	client.post('statuses/update', {status: text}, (error, tweet) => {});
};

let getTimeline = (params) => {
	return new Promise((resolve, reject) => {
		client.get('statuses/user_timeline', params, (error, tweets) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(tweets);
		});
	});
};

let countTodayTweets = (today, params, result) => {
	return getTimeline(params).then((tweets) => {
		let length = tweets.length;
		for (let i = 0; i < length; i++) {
			let tweet = tweets[i];
			let date = new Date(tweet.created_at);
			if (date.getDate() !== today.getDate()) {
				return Promise.resolve(result);
			}
			if (tweet.retweeted) {
				result.retweetCount++;
			}
			result.count++;
		}
		params.max_id = tweets[length - 1].id_str;
		if (tweets[tweets.length - 1].retweeted) {
			result.retweetCount--;
		}
		result.count--;
		return countTodayTweets(today, params, result);
	})
	.catch((error) => {
		return Promise.reject(error);
	});
};

let screenName = config.name;
let params = {
	screen_name: screenName,
	count: config.get,
};

Promise.all([
		new Promise((resolve, reject) => {
			fs.readFile(config.template, 'utf-8', (error, text) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(text);
			});
		}),
		countTodayTweets(new Date(), params, {count: 0, retweetCount: 0})
])
.then((results) => {
	let template = results[0];
	let count = results[1];
	let variables = {
		me: `@${screenName}`,
		count: count.count,
		retweet: count.retweetCount,
	};
	let text = template.replace(/\$\{([^}]*)\}/g, (match, key) => {
		return variables[key] || '';
	});
	//console.log(tweet);
	tweet(text);
})
.catch((error) => {
	tweet('@_remew_ Something was happen in counting tweets.');
	fs.writeFileSync('./error' + (+new Date()), JSON.stringify({error}));
});

