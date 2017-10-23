#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the testrpc instance that we started (if we started one and if it's still running).
  if [ -n "$testrpc_pid" ] && ps -p $testrpc_pid > /dev/null; then
    kill -9 $testrpc_pid
  fi
}

testrpc_port=8545

testrpc_running() {
  nc -z localhost "$testrpc_port"
}

start_testrpc() {
  # We define 10 accounts with balance lots of ether, needed for high-value tests.
  local accounts=(
    --account="0xe8280389ca1303a2712a874707fdd5d8ae0437fab9918f845d26fd9919af5a92,10000000000000000000000000000000000000000000000000000000000000000000000000000000"
    --account="0xed095a912033d26dc444d2675b33414f0561af170d58c33f394db8812c87a764,10000000000000000000000000000000000000000000000000000000000000000000000000000000"
    --account="0xf5556ca108835f04cd7d29b4ac66f139dc12b61396b147674631ce25e6e80b9b,10000000000000000000000000000000000000000000000000000000000000000000000000000000"
    --account="0xd1bea55dd05b35be047e409617bc6010b0363f22893b871ceef2adf8e97b9eb9,10000000000000000000000000000000000000000000000000000000000000000000000000000000"
    --account="0xfc452929dc8ffd956ebab936ed0f56d71a8c537b0393ea9da4807836942045c5,10000000000000000000000000000000000000000000000000000000000000000000000000000000"
  )

  node_modules/.bin/testrpc -i 10 --gasLimit 6000000 "${accounts[@]}" > /dev/null &
  testrpc_pid=$!
}

if testrpc_running; then
  echo "Using existing testrpc instance"
else
  echo "Starting our own testrpc instance"
  start_testrpc
fi

./node_modules/mocha/bin/mocha --timeout 10000


