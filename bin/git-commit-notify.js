#! /usr/bin/env node
const exec = require('child_process').execSync;
const Axios = require('axios');
const pkg = require('../package.json');

console.log('git-commit-notify');

const config = pkg['git-commit-notify'];

let invalid = false;
if (!config || !config.hook || !config.repo) {
  invalid = 'Missing config';
// } else if (!Array.isArray(config.devs)) {
//   invalid = 'config.devs must be array';
} else if (typeof config.hook !== 'string') {
  invalid = `config.hook must be webhook url: ${config.hook}`;
} else if (typeof config.repo !== 'string') {
  invalid = `config.repo must be repository url: ${config.repo}`;
}
if (invalid) {
  console.log('XXX invalid config: ', invalid);
  process.exit(1);
}

const pushToHook = (payload) => {
  const processedPayload = {
    text: `**${payload.author}** pushed commit with notification on **${payload.date}**\n${config.repo}/commit/${payload.hash}`,
    attachments: [{
      title: payload.subject,
      text: `\n${payload.body}`,
      color: '#409eff',
    }],
  };

  Axios.post(config.hook, {
    ...processedPayload,
  })
    .then((res) => { return console.log('XXX res', res); })
    .catch((err) => { return console.log('XXX err', err); });
};


const commits = exec('git cherry -v origin/master').toString().split('\n').filter((l) => { return l.startsWith('+'); });
commits.forEach((commit) => {
  const hash = commit.split(' ')[1];
  const [author, date, subject, body] = exec(`git log -1 --format="%aN@@@%ai@@@%s@@@%b" ${commit.split(' ')[1]}`)
    .toString().split('@@@');

  if ([subject, body].some((message) => {
    return /@\w/.test(message);
  })) {
    pushToHook({
      author, date, subject, body, hash,
    });
  } else {
    console.log('XXX commit not to notify', author, date, subject, body);
  }
});
