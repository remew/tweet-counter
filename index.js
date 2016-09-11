'use strict';

const fs = require('fs');
const Twitter = require('twitter');
/**
 * @type {function(String|Date|Moment|Object):Moment}
 */
const moment = require('moment');
const co = require('co');
const config = require('./config.js');
const TweetCounter = require('./src/index');

/**
 * Keys has four items.
 * consumer_key
 * consumer_secret
 * access_token_key
 * access_token_secret
 */
const client = new Twitter(config.Keys);
const counter = new TweetCounter(client);

co(function* () {
    const today = moment({hour: 0, minute: 0, seconds: 0, milliseconds: 0}).subtract(1, 'day');
    const screenName = config.name;
    const params = {
        screen_name: screenName,
        count: config.get,
    };
    try {
        const result = yield counter.countTodayTweets(today, params);
        const template = yield new Promise((resolve, reject) => {
            fs.readFile(config.template, 'utf-8', (error, text) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(text);
            });
        });
        const variables = {
            me: `@${screenName}`,
            count: result.count,
            retweet: result.retweetCount,
        };
        const text = template.replace(/\$\{([^}]*)\}/g, (match, key) => {
            if (variables[key] || variables[key] === 0) {
                return variables[key];
            }
            return '';
        });
        counter.tweet(text);
    } catch (e) {
        counter.tweet(`@${screenName} Something was happen in counting tweets.`);
        console.error(JSON.stringify({error}));
        fs.writeFileSync('./error' + (+new Date()), JSON.stringify({error}));
    }
});

