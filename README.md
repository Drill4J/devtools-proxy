# Devtools Proxy

A "sort-of-a-proxy" to poke Chrome DevTools [--remote-debugging-port](https://chromedevtools.github.io/devtools-protocol/#:~:text=exe-,--remote-debugging-port%3D9222,-Then) with HTTP calls

> See [DEVELOPMENT.md](./DEVELOPMENT.md) for development & build instructions

## Explanation

### What is for?

To enable JavaScript coverage collection from Selenium tests

### Why? (why not make calls to Chrome DevTools from tests code)

Yes, it is a viable solution, but it would force us to implement these calls each time we want to support new language/platform supported by Selenium

### And how is that different?

This is a standalone component that accepts HTTP calls and sends commands to DevTools "on tests behalf".

Thus, we only to implement a simple calls in test lifecycle hooks, to the likes of:

```javascript
/* WARNING: this is pseudo-code*/
const devtoolsProxy = '*localhost/docker/remote server/whatever*';
const target = {
  address: '*address of docker container running automated browser*',
  debuggingPort: '*DevTools port specified in chrome capabilities*',
};
var sessionId;

beforeAll(() => {
  http.post(devtoolsProxy, '/attach', target); // attach CDP client to remote browser's DevTools
  sessionId = http.post(drillAdminUrl, '/start-session'); // start Drill4J session
  http.post(devtoolsProxy, '/record-coverage', target); // start JS coverage collection in remote target
});

beforeEach(currentTest => {
  httpInterceptor.injectHeaders({
    // inject headers to enable coverage for backend services
    'drill-session-id': sessionId,
    'drill-test-name': currentTest.name,
  });
});

afterEach(currentTest => {
  const coverage = http.get(devtoolsProxy, '/get-coverage', target); // get coverage of last test
  http.post(drillAdminUrl, '/coverage', target, { coverage, testName: currentTest.name }); // send it to Drill4J to process
});

afterAll(() => {
  http.post(devtoolsProxy, '/detach', target); // detach CDP client from remote target
});
/* WARNING: this is pseudo-code*/
```
