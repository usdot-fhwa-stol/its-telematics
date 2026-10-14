## Installing maven and JDK
```
$ sudo apt install openjdk-17-jdk openjdk-17-jre
$ TMP_MAVEN_VERSION=3.8.6
$ wget https://apache.org/dist/maven/maven-3/$TMP_MAVEN_VERSION/binaries/apache-maven-$TMP_MAVEN_VERSION-bin.tar.gz -P /tmp
$ sudo tar xf /tmp/apache-maven-*.tar.gz -C /opt
$ sudo rm /tmp/apache-maven-*-bin.tar.gz
$ sudo ln -s /opt/apache-maven-$TMP_MAVEN_VERSION /opt/maven
$ sudo echo "export JAVA_HOME='/usr/lib/jvm/java-1.17.0-openjdk-amd64'
export M2_HOME=/opt/maven
export MAVEN_HOME=/opt/maven
export PATH=${M2_HOME}/bin:${PATH}" >> ~/.bashrc

$ mvn -v
Apache Maven 3.8.6 (84538c9988a25aec085021c365c560670ad80f63)
Maven home: /opt/maven
Java version: 17.0.4, vendor: Private Build, runtime: /usr/lib/jvm/java-17-openjdk-amd64
Default locale: en_US, platform encoding: UTF-8
OS name: "linux", version: "5.15.0-46-generic", arch: "amd64", family: "unix"
```

## Running unit tests
```
$ cd **/its-telematics/telematic_system/telematic_cloud_messaging
$ mvn test
```