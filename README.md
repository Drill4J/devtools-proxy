# Devtools Proxy

A "sort-of-a-proxy" to poke Chrome DevTools [--remote-debugging-port](https://chromedevtools.github.io/devtools-protocol/#:~:text=exe-,--remote-debugging-port%3D9222,-Then) with HTTP calls

> See [DEVELOPMENT.md](./DEVELOPMENT.md) for development & build instructions

## Explanation

### What is for?

To enable JavaScript coverage collection from Selenium tests

### Why? (why not make calls to Chrome DevTools from tests code)

Yes, it is a viable solution, but it would force us to implement these calls each time we want to support new language/platform supported by Selenium.

### And how is that different?

This is a standalone component that accepts HTTP calls and sends CDP commands (via WebSocket) to DevTools.
Thus, we only to implement a HTTP calls in test lifecycle hooks.
