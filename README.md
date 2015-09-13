[![Build Status](https://travis-ci.org/javierfernandes/slack-photobot.svg?branch=master)](https://travis-ci.org/javierfernandes/slack-photobot)

# Slack PhotoBot

A slack bot client that supports a number of messages for automatically creating a "photoshopped" image. 
Meaning that it takes a face image and combines that face into another image, previously detecting a face within it.
It uses:
* opencv for detecting the faces within images
* node-slack-upload for uploading the new images
* https://github.com/zhangyuanwei/node-images for the actual image processing (drawing the face on top of the original)
* google-images: to search for images based on text. This will be the target image to detect the face and combine the "well-known" face.


## Installation - Ubuntu

* Install OpenCV 2.4 as described here 

```
wget https://codeload.github.com/Itseez/opencv/zip/2.4.11
mv 2.4.11 opencv-2.4.zip
unzip opencv-2.4.zip
cd opencv-2.4.11
mkdir build
cd build
cmake -D CMAKE_BUILD_TYPE=RELEASE -D CMAKE_INSTALL_PREFIX=/usr/local ..
make
sudo make install
```

If you get this error while running:
```
libdc1394 error: Failed to initialize libdc1394
```
then fix it with:

```
sudo ln /dev/null /dev/raw1394
```

Then 

```
npm install
node run.js
```

## Configuration

Set your slack API token in the pbot.json file.

