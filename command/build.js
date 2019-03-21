const Steps = require("cli-step");
const chalk = require("chalk");
const fs = require("fs");
const { exec, mkdir } = require("./common");

const homeDir = process.env["HOME"];
const pkgDir = `${process.cwd()}/pkg`;
const srcDir = `${process.cwd()}/src`;
const rustcCmd = `${homeDir}/.cargo/bin/rustc`;
const cargoCmd = `${homeDir}/.cargo/bin/cargo`;
const wbgCmd = `${homeDir}/.cargo/bin/wasm-bindgen`;

async function build(file) {
  const fileName = file.split(".")[0];
  const buildDir = `/tmp/${fileName}`;
  await mkdir(buildDir);
  await exec(
    `${rustcCmd} src/${file} --target=wasm32-unknown-unknown --crate-type=cdylib -Clto -g -Copt-level=s -o ${buildDir}/main.wasm -L ${process.cwd()}/target/wasm32-unknown-unknown/release/deps -L ${process.cwd()}/target/release/deps`,
    {
      env: {
        CARGO_PKG_NAME: "hello_world",
        CARGO_PKG_VERSION: "0.1.0"
      }
    }
  );
  await exec(
    `${wbgCmd} ${buildDir}/main.wasm --no-modules --out-dir ${buildDir}`
  );
  fs.copyFileSync(
    `${buildDir}/main_bg.wasm`,
    `${process.cwd()}/pkg/${fileName}.wasm`
  );
  await exec(`rm -rf ${buildDir}`);
}

module.exports = async () => {
  const steps = new Steps(2);
  let oldStep = null;
  steps.startRecording();
  oldStep = steps
    .advance(
      "Preparing, (it may take a few minutes)",
      null,
      "cargo build --target wasm32-unknown-unknown --release"
    )
    .start();
  try {
    await exec(`${cargoCmd} build --target wasm32-unknown-unknown --release`);
  } catch (e) {
    oldStep.error("Preparing failed");
    console.error(chalk.red(e.toString()));
    process.exit(1);
  }
  oldStep.success("Preparing", "white_check_mark");

  oldStep = steps.advance("Building").start();
  try {
    await mkdir(pkgDir);
    const files = fs.readdirSync(srcDir);
    await Promise.all(
      files.map(file => {
        if (file.endsWith(".rs")) {
          return build(file);
        }
      })
    );
  } catch (e) {
    oldStep.error("Building failed");
    console.error(chalk.red(e.toString()));
    process.exit(1);
  }
  oldStep.success("Building", "white_check_mark");
};
