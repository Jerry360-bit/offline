Package.describe({
  name: 'jerry360:offline',
  version: '0.0.1',
  summary: 'An easy way to give your Meteor app offline capabilities and make it feel instant',
  git: 'https://github.com/jerry360/offline',
  documentation: 'README.md'
});

Npm.depends({
  'idb': '8.0.0'
});

Package.onUse(function(api) {
  api.versionsFrom(['2.8.1', '3.0']);
  api.use('ecmascript');
  api.use('mongo');
  api.use('check');
  api.use('mongo-id', 'client');
  api.use('tracker', 'client');
  api.use('zodern:types@1.0.13');
  api.use('jam:archive@0.1.0', { weak: true });
  api.use('jam:soft-delete@0.3.0', { weak: true });
  api.mainModule('client.js', 'client');
  api.mainModule('server.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('mongo-id', 'client');
  api.use('jam:offline');
  api.mainModule('tests.js');
});
