const cliProgress = require("cli-progress");
const log = require("fancy-log");
/**
 *
 * @param {{buildUrl: string, username: string, token: string}} options
 * @param {function} done
 */
module.exports = function (options, done) {
    if (!options.token) {
        done('please provide the jenkins api token of your user.');
    }
    if (!options.username) {
        done('please provide the jenkins username.');
    }

    const needle = require("needle");
    const log = require("fancy-log");

    const urlBase = options.buildUrl;
    const url = new URL(urlBase);
    const crumbUrl = url.origin + '/crumbIssuer/api/json';

    needle.get(crumbUrl,
        {username: options.username, password: options.token, json: true},
        (error, response) => {
            if (!error) {
                const crumb = response.body.crumb;
                const authOptions = {
                    username: options.username,
                    password: options.token,
                    headers: {
                        'Jenkins-Crumb': crumb
                    }
                }

                log(`Starting a new deploy for ${urlBase}`);

                needle.post(
                    urlBase + 'build',
                    {},
                    authOptions,
                    (err, res) => {
                        if (err) {
                            done(err);
                        } else {
                            const queApiUrl = res.headers['location'] + 'api/json?pretty=true';
                            const cliProgress = require('cli-progress');

                            const bar1 = new cliProgress.SingleBar({
                                format: ' {bar} | waiting to start | {percentage}%',
                            }, cliProgress.Presets.rect);
                            bar1.start(100, 0);

                            const awaitExecutable = (callback) => {
                                needle.get(
                                    queApiUrl,
                                    authOptions,
                                    (err, res) => {
                                        if (res.body.executable) {
                                            bar1.update(100);
                                            bar1.stop();
                                            callback(res.body.executable.url);
                                        } else {
                                            const regex = /Expires in (\d+\.?\d*) (sec|ms)/gm;
                                            const now = new Date();
                                            let m;
                                            let delay = 0;

                                            while ((m = regex.exec(res.body.why)) !== null) {
                                                delay = parseFloat(m[1]) * ( m[2] === 'sec' ? 1000 : 1) + 200;
                                            }

                                            bar1.update(Math.round(now.getTime() - res.body.inQueueSince) / (now.getTime() - res.body.inQueueSince + delay) * 100);

                                            setTimeout(awaitExecutable.bind(null, callback), 1000);
                                        }
                                    }
                                )
                            }

                            awaitExecutable((deployUrl) => {

                                const parts = deployUrl.split('/');
                                parts.pop()

                                log('Deployment Started. See ' + deployUrl + 'console for details');

                                const start = (new Date()).getTime();
                                const bar2 = new cliProgress.SingleBar({
                                    format: ' {bar} | Deployment #' + parts.pop() + ' | {percentage}% | ETA: {eta}s',
                                }, cliProgress.Presets.rect);
                                bar2.start(100, 0);
                                const deployApiUrl = deployUrl + 'api/json?pretty=true';

                                const awaitDeploy = (callback) => {
                                    needle.get(
                                        deployApiUrl,
                                        authOptions,
                                        (err, res) => {

                                            if (res.body.inProgress) {
                                                const duration = (new Date()).getTime() - start;
                                                const total = duration < res.body.estimatedDuration ? res.body.estimatedDuration : duration + 1000;
                                                bar2.update(Math.round( duration / total * 100));
                                                setTimeout(awaitDeploy.bind(null, callback), 1000);
                                            } else {
                                                bar2.update(100);
                                                bar2.stop();
                                                callback(res.body.result);
                                            }
                                        }
                                    );
                                }

                                // now we check the executable
                                awaitDeploy((result) => {

                                    if (result === 'SUCCESS') {
                                        log.info('Done. Deploy finished with ' + result);
                                    } else {
                                        log.error('ERROR: Deployment result is ' + result);
                                    }
                                    done();
                                });
                            });
                        }
                    }
                )


            } else {
                done(error);
            }

        }
    );
}