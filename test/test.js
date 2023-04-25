require('dotenv').config(); // read a .env file for local and personal configurations

const expect = require('chai').expect;
const deploy = require('../index');

const testFor = 'all';

describe('Running ' + testFor + ' tests', function () {

    this.timeout(200000);

    it('start the deploy', (done) => {
        deploy({
            buildUrl: 'https://jenkins.flowconcept.de/job/Staging8-1/job/Rollout%20Autohaus%20Hengge/',
            username: process.env.JENKINS_USERNAME,
            token: process.env.JENKINS_TOKEN
        }, (err) => {
            expect(err).to.be.undefined;
            done();
        })
    })

});