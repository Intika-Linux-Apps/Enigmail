Name:      mozilla-enigmail
Version:   0.49.5
Release:   1
Requires:  mozilla = 1.0, mozilla-mail = 1.0, mozilla-ipc = 1.0
Summary:   Enigmail: GPG/PGP integration in Mozilla
Copyright: Mozilla Public License 1.1/GPL
Group:     Applications/Internet
Source:    http://enigmail.mozdev.org/source.html
URL:       http://enigmail.mozdev.org/
Vendor:    xmlterm.org
Packager:  R. Saravanan <svn@xmlterm.org>

%description

 mozilla-enigmail: GPG/PGP integration in Mozilla

%prep
cd $RPM_BUILD_DIR
rm -rf ${RPM_PACKAGE_NAME}-${RPM_PACKAGE_VERSION}
mkdir ${RPM_PACKAGE_NAME}-${RPM_PACKAGE_VERSION}
cd ${RPM_PACKAGE_NAME}-${RPM_PACKAGE_VERSION}

unzip ${RPM_SOURCE_DIR}/enigmail-${RPM_PACKAGE_VERSION}.xpi
if [ $? -ne 0 ]; then
  exit $?
fi

chown -R root.root .
chmod -R a+rX,g-w,o-w .

%build

%install
cd ${RPM_PACKAGE_NAME}-${RPM_PACKAGE_VERSION}
install -m 755 components/enigmail.xpt /usr/lib/mozilla/components
install -m 755 components/enigmail.js  /usr/lib/mozilla/components
install -m 755 chrome/enigmail.jar     /usr/lib/mozilla/chrome

%pre

%post

if [ -f /usr/lib/mozilla/chrome/installed-chrome.txt ]; then

  cat << EOF >> /usr/lib/mozilla/chrome/installed-chrome.txt
content,install,url,jar:resource:/chrome/enigmail.jar!/content/enigmail/
skin,install,url,jar:resource:/chrome/enigmail.jar!/skin/modern/enigmail/
skin,install,url,jar:resource:/chrome/enigmail.jar!/skin/classic/enigmail/
locale,install,url,jar:resource:/chrome/enigmail.jar!/locale/en-US/enigmail/
EOF

fi

if [ -f /usr/lib/mozilla/rebuild-databases.sh ]; then
    /usr/lib/mozilla/rebuild-databases.sh
fi

%postun

if [ -f /usr/lib/mozilla/rebuild-databases.sh ]; then
    /usr/lib/mozilla/rebuild-databases.sh
fi

%files

/usr/lib/mozilla/components/enigmail.xpt
/usr/lib/mozilla/components/enigmail.js
/usr/lib/mozilla/chrome/enigmail.jar

%changelog
