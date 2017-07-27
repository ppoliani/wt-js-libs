rm -rf contracts
rm -rf migrations

cp -r wt-contracts/contracts ./
cp -r wt-contracts/migrations ./

# prepare the json for javascript
truffle compile
