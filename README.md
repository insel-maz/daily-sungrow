# daily-sungrow

This script lets you download your past daily reports from iSolarCloud (a product of Sungrow).

For this to achieve it uses [GoSungrow](https://github.com/MickMake/GoSungrow) to retrieve the data from iSolarCloud.

## Install Node.js

The script of this project requires Node.js to run. (The script is written for Node version 22).

## Prepare the GoSungrow executable

There is a Gist with instructions for building GoSungrow and further information: https://gist.github.com/Paraphraser/cad3b0aa6428c58ee87bc835ac12ed37

### Build the GoSungrow executable

In summary, install Go and then run:

```shell
mkdir -p go-projects/MickMake

cd go-projects
git clone https://github.com/MickMake/GoUnify.git

cd MickMake
git clone https://github.com/MickMake/GoSungrow.git

cd GoSungrow

git remote add -t encryption triamazikamno https://github.com/triamazikamno/GoSungrow.git
git pull triamazikamno encryption
git switch encryption

go mod tidy
go build
```

You then find the executable here: `go-projects/MickMake/GoSungrow/GoSungrow`. Copy it into this project.

### Connect to iSolarCloud

You need to configure your credentials:

```shell
./GoSungrow config write --user="..." --password="..." --host="..." --appkey="..."
```

The user name and password are those for the iSolarCloud. You find information about possible hosts and app keys in the (mentioned) Gist under [Configuration](https://gist.github.com/Paraphraser/cad3b0aa6428c58ee87bc835ac12ed37#configuration).

Login via:

```shell
./GoSungrow api login
```

## Configuration of daily-sungrow

Create the configuration files and make your personal adjustments:

* Copy `config/config.sample.json` to `config/config.json`. To find out your IDs/keys run `./GoSungrow show ps list`.
* Copy `config/nextdate.sample.txt` to `config/nextdate.txt`. Set a recent date, for example today's date minus seven days.

## Run the script

You should be able to run this script:

```shell
node index.mjs
```
