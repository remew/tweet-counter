'use strict';

const fs = require('fs');
const Twitter = require('twitter');
const config = require('./config.js');

/**
 * Keys has four items.
 * consumer_key
 * consumer_secret
 * access_token_key
 * access_token_secret
 */
const client = new Twitter(config.Keys);

const tweet = (text) => {
	// There is no error handling...
	client.post('statuses/update', {status: text}, (error, tweet) => {});
};

const getTimeline = (params) => {
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

const countTodayTweets = (today, params, result) => {
	return getTimeline(params).then((tweets) => {
		const length = tweets.length;
		for (let i = 0; i < length; i++) {
			const tweet = tweets[i];
			const date = new Date(tweet.created_at);
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

const screenName = config.name;
const params = {
	screen_name: screenName,
	count: config.get,
};

const today = new Date();
today.setDate(today.getDate() - 1);

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
		countTodayTweets(today, params, {count: 0, retweetCount: 0})
])
.then((results) => {
	const template = results[0];
	const count = results[1];
	const variables = {
		me: `@${screenName}`,
		count: count.count,
		retweet: count.retweetCount,
	};
	const text = template.replace(/\$\{([^}]*)\}/g, (match, key) => {
		return variables[key] || '';
	});
	console.log('tweet: ', text);
	tweet(text);
})
.catch((error) => {
	tweet(`@${screenName} Something was happen in counting tweets.`);
	console.log(JSON.stringify({error}));
	fs.writeFileSync('./error' + (+new Date()), JSON.stringify({error}));
});

