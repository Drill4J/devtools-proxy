# Boilerplate customization options cheatsheet

- Remove Apache 2.0 license (default is attributed to EPAM, with [LICENSE](./LICENSE) file and `eslint-plugin-drill4j` plugin to check for licence headers in each source file)

  ```shell
    rm LICENSE \
    && npm uninstall eslint-plugin-drill4j
  ```

- Remove tests setup

  ```shell
    npm uninstall jest jest-each jest-extended ts-jest \
    && rm test.tsconfig.json \
    && rm -rf __tests__
  ```

- Remove auxillary packages

  - koa

    ```shell
      npm uninstall koa koa-router koa-bodyparser @koa/cors @types/koa @types/koa-bodyparser @types/koa-router @types/koa__cors
    ```

  - misc

    ```shell
      npm uninstall fs-extra @types/fs-extra upath nanoid ramda @types/ramda
    ```

  - transport

    ```shell
      npm uninstall axios ws
    ```

  - debug

    ```shell
      npm uninstall debug chalk supports-color cli-table3
    ```

  - all of the above

    ```shell
      npm uninstall koa koa-router koa-bodyparser @koa/cors @types/koa @types/koa-bodyparser @types/koa-router @types/koa__cors fs-extra @types/fs-extra upath nanoid ramda @types/ramda axios ws debug chalk supports-color cli-table3
    ```

- Docker

  - Set the appropriate repository field in [Publish Docker Image Action](./.github/workflows/publish-docker-image.yml)

  - Remove [Dockerfile](./Dockerfile) and Github action to build+push docker image

    ```shell
      rm Dockerfile
      rm .github/workflows/publish-docker-image.yml
    ```

  - See/edit [Dockerfile](./Dockerfile) for more options (e.g. enabling `wait` utility to wait for some host to be available before this app launch)
