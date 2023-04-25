# jenkins-build-trigger
Allows to trigger builds via the api

## Installation

```npm i --save-dev jenkins-build-trigger```

## Usage

It is recommended to path the credentials using [dotenv](https://www.npmjs.com/package/dotenv):

````js
const deploy = require('jenkins-build-trigger');

deploy({
    buildUrl: deployJobUrl,
    username: process.env.JENKINS_USERNAME,
    token: process.env.JENKINS_TOKEN
    }, (err) => {
        // do whatever after the deploy
    });
````
