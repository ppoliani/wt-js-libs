
var kbpgp = require('kbpgp');
var F = kbpgp["const"].openpgp;

var WTKey = function(options){

  this.kbpgp = kbpgp;
  this.kbpgp.constants = kbpgp["const"].openpgp;
  this.publicKey = options.publicKey || '';
  this.privateKey = options.privateKey || '';

  this.importPub = function(publicKey){
    this.publicKey = options.publicKey;
  }

  this.importPriv = function(privateKey){
    this.privateKey = options.privateKey;
  }

  // Generate a user key pair to use with a userid and passphrase
  this.generate = function(userid, passphrase){
    var self = this;
    return new Promise(function(resolve, reject){
      kbpgp.KeyManager.generate_ecc({
        userid : userid,
        ecc: true,
        primary: {
          nbits: 384,
          flags: self.kbpgp.constants.certify_keys
            | self.kbpgp.constants.sign_data
            | self.kbpgp.constants.auth
            | self.kbpgp.constants.encrypt_comm
            | self.kbpgp.constants.encrypt_storage,
          expire_in: 0  // never expire
        }
     }, function(err, generated) {
        if (err)
          reject(err);
        else{
          generated.sign({}, function(err) {
            var publicPromise = new Promise(function(resolve, reject){
              generated.export_pgp_public({}, function(err, pgp_public) {
                if (err)
                  reject(err);
                else
                  resolve(pgp_public);
              });
            });
            var privatePromise = new Promise(function(resolve, reject){
              generated.export_pgp_private({ passphrase: passphrase }, function(err, pgp_private) {
                if (err)
                  reject(err);
                else
                  resolve(pgp_private);
              });
            });
            Promise.all([publicPromise, privatePromise]).then(function(keys){
              self.publicKey = keys[0];
              self.privateKey = keys[1];
              resolve({ public: keys[0], private: keys[1] });
            });
          })
        }
      });
    })
  };

  // Unlock and get the parsed the private key with the passphrase
  this.getPrivate = function(passphrase){
    var self = this;
    return new Promise(function(resolve, reject){
      self.kbpgp.KeyManager.import_from_armored_pgp({
        armored: self.privateKey
      }, function(err, unlocked) {
        if (err)
          reject(err);
        else {
          if (unlocked.is_pgp_locked()) {
            unlocked.unlock_pgp({
              passphrase: passphrase
            }, function(err) {
              if (err)
                reject(err);
              else
                resolve(unlocked);
            });
          } else {
            resolve(unlocked);
          }
        }
      });
    });
  };

  // Get the parsed public key
  this.getPublic = function(){
    return this.parsePublic(this.publicKey);
  };

  // Parse a public key
  this.parsePublic = function(pubKey){
    var self = this;
    return new Promise(function(resolve, reject){
      self.kbpgp.KeyManager.import_from_armored_pgp({
        armored: pubKey
      }, function(err, loaded) {
        if (err)
          reject(err);
        else
          resolve(loaded);
      });
    });
  };

  // Encrypt a message with and array of public keys, the passphrase need to unlock the private key and sign the data.
  this.encrypt = function(passphrase, to, data){
    var self = this;
    return new Promise(function(resolve, reject){
      var promises = [];
      promises.push(self.getPrivate(passphrase))
      for (var i = 0; i < to.length; i++)
        promises.push(self.parsePublic(to[i]));
      Promise.all(promises).then(function(result){
        self.kbpgp.box({
          msg: data,
          encrypt_for: result.splice(1),
          sign_with: result[0]
        }, function(err, result_string, result_buffer) {
          if (err)
            reject(err);
          else
            resolve(result_string);
        });
      })
    });
  },

  // Decrypt the data of a message with the sender public key and the receiver passphrase
  this.decrypt = function(passphrase, from, data){
    var self = this;
    return new Promise(function(resolve, reject){
      Promise.all([
        self.parsePublic(from),
        self.getPrivate(passphrase)
      ]).then(function(result){
        var ring = new self.kbpgp.keyring.KeyRing;
        ring.add_key_manager(result[0])
        ring.add_key_manager(result[1])
        self.kbpgp.unbox({keyfetch: ring, armored: data }, function(err, literals) {
          if (err) {
            reject(err);
          } else {
            var ds = km = null;
            ds = literals[0].get_data_signer();
            if (ds) { km = ds.get_key_manager(); }
            if (km) {
              resolve([literals[0].toString(), km.get_pgp_fingerprint().toString('hex')])
            } else {
              resolve([literals[0].toString(), null]);
            }
          }
        });
      });
    });
  };

};

module.exports = WTKey;
