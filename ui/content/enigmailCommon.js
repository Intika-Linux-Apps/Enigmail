// enigmailCommon.js: shared JS functions for Enigmail

// This Enigmail version and compatible IPC version
var gEnigmailVersion = "0.49.5.0";
var gIPCVersion      = "0.99.9.0";

// Maximum size of message directly processed by Enigmail
const MESSAGE_BUFFER_SIZE = 32000;

const NS_PROCESSINFO_CONTRACTID = "@mozilla.org/xpcom/process-info;1";
const NS_PIPECONSOLE_CONTRACTID = "@mozilla.org/process/pipe-console;1"
const NS_ENIGMAIL_CONTRACTID    = "@mozdev.org/enigmail/enigmail;1";
const NS_STREAMCONVERTERSERVICE_CID_STR =
      "{892FFEB0-3F80-11d3-A16C-0050041CAF44}";

const NS_ISCRIPTABLEUNICODECONVERTER_CONTRACTID = "@mozilla.org/intl/scriptableunicodeconverter";

const ENIGMAIL_PREFS_ROOT       = "extensions.enigmail.";

// Interfaces
const nsIEnigmail               = Components.interfaces.nsIEnigmail;

// Encryption flags
if (nsIEnigmail) {
  const SIGN_MSG    = nsIEnigmail.SEND_SIGNED;
  const ENCRYPT_MSG = nsIEnigmail.SEND_ENCRYPTED;
  const ENCRYPT_OR_SIGN_MSG = ENCRYPT_MSG | SIGN_MSG;
}

// UserIdSource values
const USER_ID_SPECIFIED = 0;
const USER_ID_DEFAULT   = 1;
const USER_ID_FROMADDR  = 2;

const BUTTON_POS_0           = 1;
const BUTTON_POS_1           = 1 << 8;
const BUTTON_POS_2           = 1 << 16;
const BUTTON_TITLE_IS_STRING = 127;
  
const THREE_BUTTON_STRINGS   = (BUTTON_TITLE_IS_STRING * BUTTON_POS_0) +
                               (BUTTON_TITLE_IS_STRING * BUTTON_POS_1) +
                               (BUTTON_TITLE_IS_STRING * BUTTON_POS_2);


var gEnigmailPrefDefaults = {"configuredVersion":"",
                             "logDirectory":"",
                             "initAlertCount":2,
                             "composeHtmlAlertCount":3,
                             "agentPath":"",
                             "passivePrivacy":false,
                             "useDefaultComment":false,
                             "userIdSource":USER_ID_DEFAULT,
                             "userIdValue":"",
                             "noPassphrase":false,
                             "defaultSignMsg":false,
                             "defaultEncryptSignMsg":false,
                             "defaultSignNewsMsg":false,
                             "alwaysTrustSend":true,
                             "encryptToSelf":true,
                             "confirmBeforeSend":false,
                             "maxIdleMinutes":5,
                             "keyserver":"www.keyserver.net",
                             "autoDecrypt":true,
                             "captureWebMail":false,
                             "disableSMIMEui":true,
                             "parseAllHeaders":true,
                             "show_headers":1
                            };

var gLogLevel = 3;     // Output only errors/warnings by default
var gDebugLog;

var gEnigPrefSvc, gEnigPrefRoot, gPrefEnigmail;
try {
  gEnigPrefSvc = Components.classes["@mozilla.org/preferences-service;1"]
                             .getService(Components.interfaces.nsIPrefService);

  gEnigPrefRoot        = gEnigPrefSvc.getBranch(null);
  gPrefEnigmail = gEnigPrefSvc.getBranch(ENIGMAIL_PREFS_ROOT);

  if (EnigGetPref("logDirectory"))
    gLogLevel = 5;

} catch (ex) {
  ERROR_LOG("enigmailCommon.js: Error in instantiating PrefService\n");
}

var gPromptService;

// Initializes enigmailCommon
function EnigInitCommon(id) {
   gPromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

   try {
     var processInfo = Components.classes[NS_PROCESSINFO_CONTRACTID].getService(Components.interfaces.nsIProcessInfo);

     var nspr_log_modules = processInfo.getEnv("NSPR_LOG_MODULES");

     var matches = nspr_log_modules.match(/enigmailCommon:(\d+)/);

     if (matches && (matches.length > 1)) {
       gLogLevel = matches[1];
       WARNING_LOG("enigmailCommon.js: gLogLevel="+gLogLevel+"\n");
     }

   } catch (ex) {
     dump("enigmailCommon.js: Error in instantiating ProcessInfo\n");
   }

   DEBUG_LOG("enigmailCommon.js: EnigInitCommon: id="+id+"\n");
}

var gEnigmailSvc;

function GetEnigmailSvc() {
  // Lazy initialization of enigmail JS component (for efficiency)

  if (gEnigmailSvc) {
    return gEnigmailSvc.initialized ? gEnigmailSvc : null;
  }

  try {
    gEnigmailSvc = Components.classes[NS_ENIGMAIL_CONTRACTID].createInstance(Components.interfaces.nsIEnigmail);

  } catch (ex) {
    ERROR_LOG("enigmailCommon.js: Error in instantiating EnigmailService\n");
    return null;
  }

  DEBUG_LOG("enigmailCommon.js: gEnigmailSvc = "+gEnigmailSvc+"\n");

  if (!gEnigmailSvc.initialized) {
    // Initialize enigmail

    var firstInitialization = !gEnigmailSvc.initializationAttempted;

    try {
      // Initialize enigmail
      gEnigmailSvc.initialize(gEnigmailVersion, gPrefEnigmail);

      try {
        // Reset alert count to default value
        gPrefEnigmail.clearUserPref("initAlertCount");
      } catch(ex) {
      }

    } catch (ex) {

      if (firstInitialization) {
        // Display initialization error alert
        var errMsg = gEnigmailSvc.initializationError ? gEnigmailSvc.initializationError : "Error in initializing Enigmail service";

        errMsg += "\n\nTo avoid this alert, either fix the problem or uninstall Enigmail using the Edit->Preferences->Privacy&Security->Enigmail menu"

        EnigAlertCount("initAlertCount", "Enigmail: "+errMsg);
      }

      return null;
    }

    var configuredVersion = EnigGetPref("configuredVersion");

    DEBUG_LOG("enigmailCommon.js: GetEnigmailSvc: "+configuredVersion+"\n");

    if (gEnigmailSvc.initialized && (gEnigmailVersion != configuredVersion)) {
      EnigConfigure();
    }
  }

  if (gEnigmailSvc.logFileStream) {
    gDebugLog = true;
    gLogLevel = 5;
  }

  return gEnigmailSvc.initialized ? gEnigmailSvc : null;
}


function EnigUpdate_0_50() {
  DEBUG_LOG("enigmailCommon.js: EnigUpdate_0_50: \n");

  try {
    var defaultEncryptMsg = gPrefEnigmail.getBoolPref("defaultEncryptMsg");

    try {
      var defaultEncryptSignMsg = gPrefEnigmail.getBoolPref("defaultEncryptSignMsg");

    } catch (ex) {
      DEBUG_LOG("enigmailCommon.js: EnigUpdate_0_50: deleting defaultEncryptMsg\n");
      gPrefEnigmail.setBoolPref("defaultEncryptSignMsg", defaultEncryptMsg);
      gPrefEnigmail.deleteBranch("defaultEncryptMsg");
      EnigSavePrefs();
    }

  } catch (ex) {}
}

function EnigConfigure() {
  try {
    // Updates for specific versions (to be cleaned-up periodically)
    EnigUpdate_0_50();
  } catch (ex) {}

  var msg = "Do you wish to configure enigmail for version "+
            gEnigmailVersion+" now?";

  var checkValueObj = new Object();
  checkValueObj.value = false;

  var buttonPressed = gPromptService.confirmEx(window,
                                           "Configure Enigmail?",
                                            msg,
                                            THREE_BUTTON_STRINGS,
                                            "Yes",
                                            "No",
                                            "Do not ask me again",
                                            "",
                                            checkValueObj);

  DEBUG_LOG("enigmailCommon.js: EnigConfigure: "+buttonPressed+" \n");

  if (buttonPressed == 1)  // Configure later
    return;

  for (var prefName in gEnigmailPrefDefaults) {
    if (prefName.search(/AlertCount$/) >= 0) {
       // Reset alert count to default value
      try {
        gPrefEnigmail.clearUserPref(prefName);
      } catch(ex) {
      }
    }
  }

  if (buttonPressed == 0) {
    // Configure now
    EnigPrefWindow();

  } else {
    // "Do not ask me again" => "already configured"
    EnigSetPref("configuredVersion", gEnigmailVersion);
    EnigSavePrefs();
  }
}

///////////////////////////////////////////////////////////////////////////////
// File read/write operations

const NS_LOCAL_FILE_CONTRACTID = "@mozilla.org/file/local;1";

const NS_LOCALFILEOUTPUTSTREAM_CONTRACTID =
                              "@mozilla.org/network/file-output-stream;1";

const NS_RDONLY      = 0x01;
const NS_WRONLY      = 0x02;
const NS_CREATE_FILE = 0x08;
const NS_TRUNCATE    = 0x20;
const DEFAULT_FILE_PERMS = 0600;

const FileChannel = new Components.Constructor( "@mozilla.org/network/local-file-channel;1", "nsIFileChannel" );

const InputStream = new Components.Constructor( "@mozilla.org/scriptableinputstream;1", "nsIScriptableInputStream" );

function CreateFileStream(filePath, permissions) {
  //DEBUG_LOG("enigmailCommon.js: CreateFileStream: file="+filePath+"\n");

  try {
    var localFile = Components.classes[NS_LOCAL_FILE_CONTRACTID].createInstance(Components.interfaces.nsILocalFile);

    localFile.initWithPath(filePath);

    if (localFile.exists()) {

      if (localFile.isDirectory() || !localFile.isWritable())
         throw Components.results.NS_ERROR_FAILURE;

      if (!permissions)
        permissions = localFile.permissions;
    }

    if (!permissions)
      permissions = DEFAULT_FILE_PERMS;

    var flags = NS_WRONLY | NS_CREATE_FILE | NS_TRUNCATE;

    var fileStream = Components.classes[NS_LOCALFILEOUTPUTSTREAM_CONTRACTID].createInstance(Components.interfaces.nsIFileOutputStream);

    fileStream.init(localFile, flags, permissions);

    return fileStream;

  } catch (ex) {
    ERROR_LOG("enigmailCommon.js: CreateFileStream: Failed to create "+filePath+"\n");
    return null;
  }
}

function WriteFileContents(filePath, data, permissions) {

  //DEBUG_LOG("enigmailCommon.js: WriteFileContents: file="+filePath+"\n");

  try {
    var fileOutStream = CreateFileStream(filePath, permissions);

    if (data.length) {
      if (fileOutStream.write(data, data.length) != data.length)
        throw Components.results.NS_ERROR_FAILURE;

      fileOutStream.flush();
    }
    fileOutStream.close();

  } catch (ex) {
    ERROR_LOG("enigmailCommon.js: WriteFileContents: Failed to write to "+filePath+"\n");
    return false;
  }

  return true;
}

// maxBytes == -1 => read whole file
function ReadFileContents(localFile, maxBytes) {
  DEBUG_LOG("enigmailCommon.js: ReadFileContents: file="+localFile.leafName+
            ", "+maxBytes+"\n");

  var fileChannel = new FileChannel();

  if (!localFile.exists() || !localFile.isReadable())
    throw Components.results.NS_ERROR_FAILURE;

  fileChannel.init(localFile, NS_RDONLY, 0);

  var rawInStream = fileChannel.open();

  var scriptableInStream = new InputStream();    
  scriptableInStream.init(rawInStream);

  if ((maxBytes < 0) || (maxBytes > localFile.fileSize))
    maxBytes = localFile.fileSize;

  var fileContents = scriptableInStream.read(maxBytes);

  scriptableInStream.close();

  return fileContents;
}

///////////////////////////////////////////////////////////////////////////////

function WRITE_LOG(str) {
  dump(str);

  if (gDebugLog && gEnigmailSvc && gEnigmailSvc.logFileStream) {
    gEnigmailSvc.logFileStream.write(str, str.length);
  }
}

function DEBUG_LOG(str) {
  if (gLogLevel >= 4)
    WRITE_LOG(str);
}

function WARNING_LOG(str) {
  if (gLogLevel >= 3)
    WRITE_LOG(str);
}

function ERROR_LOG(str) {
  if (gLogLevel >= 2)
    WRITE_LOG(str);
}

function CONSOLE_LOG(str) {
  if (gLogLevel >= 3)
    WRITE_LOG(str);

  if (gEnigmailSvc && gEnigmailSvc.console)
    gEnigmailSvc.console.write(str);
}

///////////////////////////////////////////////////////////////////////////////

function EnigAlert(mesg) {
  gPromptService.alert(window, "Enigmail Alert", mesg);
}

function EnigAlertCount(countPrefName, mesg) {
  var alertCount = EnigGetPref(countPrefName);

  if (alertCount <= 0)
    return;

  alertCount--;
  EnigSetPref(countPrefName, alertCount);

  if (alertCount > 0) {
    mesg += "\n\nThis alert will repeat "+alertCount+" more time";
    mesg += (alertCount == 1) ? "." : "s.";
  } else {
    mesg += "\n\nThis alert will not repeat until you upgrade Enigmail.";
  }

  EnigAlert(mesg);
}

function EnigConfirm(mesg) {
  return gPromptService.confirm(window, "Enigmail Confirm", mesg);
}

function EnigError(mesg) {
  return gPromptService.alert(window, "Enigmail Error", mesg);
}

function EnigPrefWindow() {
  goPreferences("securityItem",
                "chrome://enigmail/content/pref-enigmail.xul",
                "enigmail");
}

function EnigAdvPrefWindow() {
  window.openDialog("chrome://enigmail/content/pref-enigmail-adv.xul",
                    "_blank", "chrome,resizable=yes");
}

function EnigHelpWindow(source) {
   
   var helpUrl = "http://enigmail.mozdev.org/help.html";

   if (source)
     helpUrl += "#" + source

   window.open(helpUrl);
}

function EnigUpgrade() {
  window.openDialog("http://enigmail.mozdev.org/update.html?upgrade=yes&enigmail="+gEnigmailVersion+"&ipc="+gIPCVersion, "dialog");
}

function EnigSetDefaultPrefs() {
  DEBUG_LOG("enigmailCommon.js: EnigSetDefaultPrefs\n");
  for (var prefName in gEnigmailPrefDefaults) {
    var prefValue = EnigGetPref(prefName);
  }
}

function EnigSavePrefs() {
  DEBUG_LOG("enigmailCommon.js: EnigSavePrefs\n");
  try {
    gEnigPrefSvc.savePrefFile(null);
  } catch (ex) {
  }
}

function EnigGetPref(prefName) {
   var defaultValue = gEnigmailPrefDefaults[prefName];

   var prefValue = defaultValue;
   try {
      // Get pref value
      switch (typeof defaultValue) {
      case "boolean":
         prefValue = gPrefEnigmail.getBoolPref(prefName);
         break;

      case "number":
         prefValue = gPrefEnigmail.getIntPref(prefName);
         break;

      case "string":
         prefValue = gPrefEnigmail.getCharPref(prefName);
         break;

      default:
         prefValue = undefined;
         break;
     }

   } catch (ex) {
      // Failed to get pref value; set pref to default value
      switch (typeof defaultValue) {
      case "boolean":
         gPrefEnigmail.setBoolPref(prefName, defaultValue);
         break;

      case "number":
         gPrefEnigmail.setIntPref(prefName, defaultValue);
         break;

      case "string":
         gPrefEnigmail.setCharPref(prefName, defaultValue);
         break;

      default:
         break;
     }
   }

   //DEBUG_LOG("enigmailCommon.js: EnigGetPref: "+prefName+"="+prefValue+"\n");
   return prefValue;
}

function EnigSetPref(prefName, value) {
   DEBUG_LOG("enigmailCommon.js: EnigSetPref: "+prefName+", "+value+"\n");

   var defaultValue = gEnigmailPrefDefaults[prefName];

   var retVal = false;

   switch (typeof defaultValue) {
      case "boolean":
         gPrefEnigmail.setBoolPref(prefName, value);
         retVal = true;
         break;

      case "number":
         gPrefEnigmail.setIntPref(prefName, value);
         retVal = true;
         break;

      case "string":
         gPrefEnigmail.setCharPref(prefName, value);
         retVal = true;
         break;

      default:
         break;
   }

   return retVal;
}


function RequestObserver(terminateFunc, terminateArg)
{
  this._terminateFunc = terminateFunc;
  this._terminateArg = terminateArg;
}

RequestObserver.prototype = {

  _terminateFunc: null,
  _terminateArg: null,

  QueryInterface: function (iid) {
    if (!iid.equals(Components.interfaces.nsIRequestObserver) &&
        !iid.equals(Components.interfaces.nsISupports))
      throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  onStartRequest: function (channel, ctxt)
  {
    DEBUG_LOG("enigmailCommon.js: RequestObserver.onStartRequest\n");
  },

  onStopRequest: function (channel, ctxt, status)
  {
    DEBUG_LOG("enigmailCommon.js: RequestObserver.onStopRequest: "+ctxt+"\n");
    this._terminateFunc(this._terminateArg, ctxt);
  }
}


function EnigConvertFromUnicode(text, charset) {
  DEBUG_LOG("enigmailCommon.js: EnigConvertFromUnicode: "+charset+"\n");

  if (!text || !charset || (charset.toLowerCase() == "iso-8859-1"))
    return text;

  // Encode plaintext
  try {
    var unicodeConv = Components.classes[NS_ISCRIPTABLEUNICODECONVERTER_CONTRACTID].getService(Components.interfaces.nsIScriptableUnicodeConverter);

    unicodeConv.charset = charset;
    return unicodeConv.ConvertFromUnicode(text);

  } catch (ex) {
    return text;
  }
}


function EnigConvertToUnicode(text, charset) {
  DEBUG_LOG("enigmailCommon.js: EnigConvertToUnicode: "+charset+"\n");

  if (!text || !charset || (charset.toLowerCase() == "iso-8859-1"))
    return text;

  // Encode plaintext
  try {
    var unicodeConv = Components.classes[NS_ISCRIPTABLEUNICODECONVERTER_CONTRACTID].getService(Components.interfaces.nsIScriptableUnicodeConverter);

    unicodeConv.charset = charset;
    return unicodeConv.ConvertToUnicode(text);

  } catch (ex) {
    return text;
  }
}


function EnigGetDeepText(node) {

  DEBUG_LOG("enigmailCommon.js: EnigDeepText: <" + node.tagName + ">\n");

  var depth = 0;
  var textArr = [""];

  while (node) {

    while (node.hasChildNodes()) {
       depth++;
       node = node.firstChild;
    }

    if (node.nodeType == Node.TEXT_NODE) {
      textArr.push(node.data);
    }

    while (!node.nextSibling && (depth > 0)) {
      depth--;
      node = node.parentNode;
    }

    if (depth > 0) {
      node = node.nextSibling;
    } else {
      node = null;
    }
  }

  return textArr.join("");
}

// Dump HTML content as plain text
function EnigDumpHTML(node)
{
    var type = node.nodeType;
    if (type == Node.ELEMENT_NODE) {

        // open tag
        DEBUG_LOG("<" + node.tagName)

        // dump the attributes if any
        attributes = node.attributes;
        if (null != attributes) {
            var countAttrs = attributes.length;
            var index = 0
            while(index < countAttrs) {
                att = attributes[index];
                if (null != att) {
                    DEBUG_LOG(" "+att.name+"='"+att.value+"'")
                }
                index++
            }
        }

        // close tag
        DEBUG_LOG(">")

        // recursively dump the children
        if (node.hasChildNodes()) {
            // get the children
            var children = node.childNodes;
            var length = children.length;
            var count = 0;
            while(count < length) {
                var child = children[count]
                EnigDumpHTML(child)
                count++
            }
            DEBUG_LOG("</" + node.tagName + ">");
        }


    }
    // if it's a piece of text just dump the text
    else if (type == Node.TEXT_NODE) {
        DEBUG_LOG(node.data)
    }
}

/////////////////////////
// Console stuff
/////////////////////////


const WMEDIATOR_CONTRACTID = "@mozilla.org/rdf/datasource;1?name=window-mediator";
const nsIWindowMediator    = Components.interfaces.nsIWindowMediator;

function EnigClearPassphrase() {
  DEBUG_LOG("enigmailCommon.js: EnigClearPassphrase: \n");

  var enigmailSvc = GetEnigmailSvc();
  if (!enigmailSvc)
    return;

  enigmailSvc.clearCachedPassphrase();
}

function EnigViewConsole() {
  DEBUG_LOG("enigmailCommon.js: EnigViewConsole\n");
  window.open('enigmail:console', 'Enigmail Console');

  //var navWindow = LoadURLInNavigatorWindow("enigmail:console", true);
  //if (navWindow) navWindow.focus();
}

function EnigViewDebugLog() {
  DEBUG_LOG("enigmailCommon.js: EnigViewDebugLog\n");

  var logDirectory = EnigGetPref("logDirectory");

  if (!logDirectory) {
    EnigAlert("Please set advanced preference 'Log directory' to create log file");
    return;
  }

  if (!gEnigmailSvc) {
    EnigAlert("Log file has not been created yet!");
    return;
  }

  if (!gEnigmailSvc.logFileStream) {
    EnigAlert("Please restart Mozilla to create log file");
    return;
  }

  gEnigmailSvc.logFileStream.flush();

  logDirectory = logDirectory.replace(/\\/g, "/");

  var logFileURL = "file:///" + logDirectory + "/enigdbug.txt";

  window.open(logFileURL, 'Enigmail Debug Log');
}

function EnigKeygen() {
  DEBUG_LOG("enigmailCommon.js: EnigKeygen\n");

  window.openDialog('chrome://enigmail/content/enigmailKeygen.xul',
                    'Enigmail Key Generation',
                    'chrome,dialog,close=no,resizable=yes,width=600');

}

// retrieves the most recent navigator window (opens one if need be)
function LoadURLInNavigatorWindow(url, aOpenFlag)
{
  DEBUG_LOG("enigmailCommon.js: LoadURLInNavigatorWindow: "+url+", "+aOpenFlag+"\n");

  var navWindow;

  // if this is a browser window, just use it
  if ("document" in top) {
    var possibleNavigator = top.document.getElementById("main-window");
    if (possibleNavigator &&
        possibleNavigator.getAttribute("windowtype") == "navigator:browser")
      navWindow = top;
  }

  // if not, get the most recently used browser window
  if (!navWindow) {
    var wm = Components.classes[WMEDIATOR_CONTRACTID].getService(nsIWindowMediator);
    navWindow = wm.getMostRecentWindow("navigator:browser");
  }

  if (navWindow) {

    if ("loadURI" in navWindow)
      navWindow.loadURI(url);
    else
      navWindow._content.location.href = url;

  } else if (aOpenFlag) {
    // if no browser window available and it's ok to open a new one, do so
    navWindow = window.open(url, "EnigmailConsole");
  }

  DEBUG_LOG("enigmailCommon.js: LoadURLInNavigatorWindow: navWindow="+navWindow+"\n");

  return navWindow;
}
