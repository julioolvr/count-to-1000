# Slack PhotoBot

A slack bot client that supports a number of messages for automatically creating a "photoshopped" image. 
Meaning that it takes a face image and combines that face into another image, previously detecting a face within it.
It uses:
* opencv for detecting the faces within images
* node-slack-upload for uploading the new images
* images for the actual image processing (drawing the face on top of the original)
* google-images: to search for images based on text. This will be the target image to detect the face and combine the "well-known" face.

