/*global do_load_module: false, do_get_file: false, do_get_cwd: false, testing: false, test: false, Assert: false, resetting: false, JSUnit: false, do_test_pending: false, do_test_finished: false, component: false */
/*global EnigmailCore: false, Cc: false, Ci: false, EnigmailFiles: false, EnigmailLog: false, EnigmailPrefs: false */
/*global Components: false, setupTestAccounts: false */
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

do_load_module("file://" + do_get_cwd().path + "/testHelper.js"); /*global TestHelper: false, addMacPaths: false, withEnigmail: false, withTestGpgHome: false, Cu: false*/

testing("autocryptSetup.jsm"); /*global EnigmailAutocryptSetup: false, enigGenKeyObserver: false */

component("enigmail/keyRing.jsm"); /*global EnigmailKeyRing: false */
component("enigmail/autocrypt.jsm"); /*global EnigmailAutocrypt: false */


let autocryptHeader = "addr=khushil@enigmail-test.com; prefer-encrypt=mutual; keydata= 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 5A==";

var cu = Components.utils;
let consol = (cu.import("resource://gre/modules/Console.jsm", {})).console;

//testing: startKeyGen
test(withTestGpgHome(withEnigmail(function keyGenTest() {

  EnigmailKeyRing.clearCache();
  let inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(Ci.nsIJSInspector);

  let headerValue = {
    userName: 'Test Name',
    userEmail: 'Testing@gmail.com'
  };

  EnigmailKeyRing.clearCache();
  EnigmailAutocryptSetup.startKeyGen(headerValue).then((value) => {
    let keys = EnigmailKeyRing.getAllSecretKeys();
    Assert.equal(value, 0);
    Assert.equal(keys.length, 1);
    Assert.equal(keys[0].userIds[0].userId,"Test Name <Testing@gmail.com>");
    Assert.equal(keys[0].keySize,"4096");
    inspector.exitNestedEventLoop();
  }).catch(res => {
    Assert.ok(false);
    inspector.exitNestedEventLoop();
  });

  inspector.enterNestedEventLoop(0);
})));

//testing: processAutocryptHeader
test(function processAutocryptHeaderTest() {
  let inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(Ci.nsIJSInspector);

  let date = new Date();
  date.setTime(Date.now() - 5 * 86400 * 1000); // 5 days ago
  const sentDate = date.toUTCString();

  let headerValue = {
    autocryptheaders: [{
      date: sentDate,
      fromAddr: 'khushil@enigmail-test.com',
      msgData: [autocryptHeader]
    }]
  };

  var window = JSUnit.createStubWindow();
  EnigmailKeyRing.clearCache();

  EnigmailAutocryptSetup.processAutocryptHeader(headerValue, window).then((value)=> {
    Assert.equal(value, 0);
    return EnigmailAutocrypt.getOpenPGPKeyForEmail(["khushil@enigmail-test.com"]);
  }).then((keys) => {
    Assert.equal(keys.length, 1);
    Assert.equal(keys[0].email, "khushil@enigmail-test.com");
    Assert.equal(keys[0].lastAutocrypt.toUTCString(), sentDate);
    inspector.exitNestedEventLoop();
  }).catch(res => {
    Assert.ok(false);
    inspector.exitNestedEventLoop();
  });

  inspector.enterNestedEventLoop(0);
});

//testing: performAutocryptSetup
test(withTestGpgHome(withEnigmail(function performAutocryptSetupTest() {
  let inspector = Cc["@mozilla.org/jsinspector;1"].createInstance(Ci.nsIJSInspector);

  EnigmailKeyRing.clearCache();
  setupTestAccounts();

  let msgAccountManager = Cc["@mozilla.org/messenger/account-manager;1"].getService(Ci.nsIMsgAccountManager);
  let accounts = msgAccountManager.accounts;
  let account = accounts.queryElementAt(0, Ci.nsIMsgAccount);
  let accountIdentity = account.defaultIdentity;

  let userName = accountIdentity.fullName,
    userEmail = accountIdentity.email,
    expiry = 1825,
    keyLength = 4096,
    keyType = "RSA",
    passphrase = "",
    generateObserver = new enigGenKeyObserver();
  let keygenRequest = EnigmailKeyRing.generateKey(userName, "", userEmail, expiry, keyLength, keyType, passphrase, generateObserver);

  keygenRequest.wait();

  let keys = EnigmailKeyRing.getAllSecretKeys();

  consol.log(keys);

  // let keyID = accountIdentity.getCharAttribute("pgpkeyId");
  //
  let key = EnigmailKeyRing.getKeyById("A990681AD2748F08");

  let key1 = EnigmailKeyRing.getSecretKeyByUserId(accountIdentity.email);

  consol.log(key, key1);

  consol.log(accountIdentity);
  //
  // let valid = EnigmailAutocrypt.getOpenPGPKeyForEmail(accountIdentity.email);
  //
  // consol.log(keyID, key, valid);

  EnigmailAutocrypt.createSetupMessage(accountIdentity).then((value) => {
    Assert.notEqual(value, null);
    consol.log(value);
    inspector.exitNestedEventLoop();
  }).catch(err => {
    consol.log('err',err);
    inspector.exitNestedEventLoop();
  });

  inspector.enterNestedEventLoop(0);

})));