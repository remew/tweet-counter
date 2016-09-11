'use strict';

const co = require('co');
/**
 * @type {function(String|Date|Moment|Object):Moment}
 */
const moment = require('moment');

class TweetCounter {
    /**
     * @constructor
     * @param {Twitter} client - instance of Twitter module.
     */
    constructor(client) {
        this._client = client;
    }

    tweet(text) {
        return new Promise((resolve, reject) => {
            this._client.post('statuses/update', {status: text}, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(result);
            });
        });
    }

    getTimeline(params) {
        return new Promise((resolve, reject) => {
            this._client.get('statuses/user_timeline', params, (err, tweets) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(tweets);
            });
        });
    }

    /**
     *
     * @param _today {Moment|Date|String}
     * @param params {Object}
     * @returns {*}
     */
    countTodayTweets(_today, params) {
        const _this = this;
        const today = moment(_today);
        const tomorrow = moment(today).add(1, 'days');
        return co(function*() {
            let tweets = [];
            // after
            while(true) {
                const tmpTweets = yield _this.getTimeline(params);
                params.max_id = tmpTweets[tmpTweets.length - 1].id_str;
                if (tmpTweets.some(t => tomorrow.isAfter(new Date(t.created_at)))) {
                    tweets = tweets.concat(tmpTweets);
                    break;
                }
            }
            // same day
            while(true) {
                const tmpTweets = yield _this.getTimeline(params);
                params.max_id = tmpTweets[tmpTweets.length - 1].id_str;
                tweets = tweets.concat(tmpTweets);
                if (tmpTweets.some(t => today.isAfter(new Date(t.created_at)))) {
                    break;
                }
            }
            tweets = tweets.filter(t => today.isSame(new Date(t.created_at), 'day'));
            return {
                count: tweets.length,
                retweetCount: tweets.filter(t => t.retweeted).length
            };
        });
    }
}

module.exports = TweetCounter;

