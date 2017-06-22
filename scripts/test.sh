#! /bin/bash

output=$(nc -z localhost 8545; echo $?)
[ $output -eq "0" ] && trpc_running=true
if [ ! $trpc_running ]; then
  echo "Starting our own testrpc node instance"
  npm run testrpc \
    --account="0xe8280389ca1303a2712a874707fdd5d8ae0437fab9918f845d26fd9919af5a92,10000000000000000000000000000000000000000000000000000000000000000000000000" \
    > /dev/null &
  trpc_pid=$!
fi
./node_modules/truffle/cli.js test ./test/*.js
if [ ! $trpc_running ]; then
  kill -9 $trpc_pid
fi
