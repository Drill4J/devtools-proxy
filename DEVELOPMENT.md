# DEVELOPMENT

## Prerequisites

1. Compatible [Node.js](https://nodejs.org/en/) version installed (At the moment it is `14.4.0`)
2. Git Bash shell (a preferred one)

## Development

**_TODO add [workspace recommended extensions](https://code.visualstudio.com/docs/editor/extension-marketplace#_workspace-recommended-extensions) for VS Code_**

1. Run `npm install`

2. Recommended editor is [VS Code](https://code.visualstudio.com/). There are two launch tasks configured.

3. Run `Nodemon` VS code launch task to start development

   - This task launches webpack & nodemon. Rebuild on changes + debugger is attached.
   - refer to `"env"` field in [Nodemon config](nodemon.json) to supply environment variables
     > Changing variables in `"env"` requires full restart. Close all terminals, stop debugging session and launch `Nodemon` task again.

4. Run `Jest Current File` to write/debug tests
   - launches Jest for currently open test file. Debugger is attached

## Build Docker image manually

**Prerequisite:** [Docker](https://docker.com/) installed

```shell
  docker login # optional, run only first time
  docker build . -t drill4j/my-awesome-app:*PLACE_IMAGE TAG HERE*
  docker push drill4j/my-awesome-app:*PLACE_IMAGE TAG HERE*
```

## Build executable (handy for setups where no Docker, nor Node are available)

**Prerequisite:** [Pkg](https://www.npmjs.com/package/pkg) installed

> Pkg will not resolve dynamic module imports, so avoid these at all costs. (Basically, just use plain ordinary static `import Something from 'somewhere'` and no issue should arise)

Build executable using the following lines

```shell
  rm -rf node_modules
  rm -rf dist
  npm install
  npx webpack
  pkg ./dist/index.js
```

> You can specify targets with `-t` option (refer to `pkg --help` and examples on [pkg's npm](https://www.npmjs.com/package/pkg))
> e.g. use `pkg -t node14-win-x64 ./dist/index.js` to build for Node14, Windows x64

### Launch executable

1. Create .env file (e.g. `my-awesome-app.env`) (refer to `"env"` field in [Nodemon config](nodemon.json) to see available environment variables)

2. Parse env file and pass it to executable using the following lines

   > Git Bash shell is recommended

   ```shell
     eval $(egrep -v '^#' my-awesome-app.env | xargs) ./index.exe
   ```
