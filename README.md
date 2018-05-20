
## Photo and Movies Web Site / Comics Page

This Project is a rewrite of my Web Site ivanlagace2.com.  The idea is to manage approximately 25000 photos and about 200 videos I have personally captured over the last 35 years.  I originally wrote the site back in early 2000 in javascript with some C# code for generating the folder structures.  The Web Site chronicles the life of my parents, my own family, the many trips I have completed all over the world and the people I have met.

As an experiment I am rebuilding the Web Site from scratch using node.js, mongoDB, angularJS and a Bootstrap HTML template that I bought online and which I modified substantially.  The Bootstrap model is using modules like isotope and photostack.  I am using Bower and Gulp to manage the code.  The web site is deployed on AWS EC2.  The goal is to improve the hosting of my website (on my local PC previously) and improve the site management when adding more materials.

I also added a comics display page with an editor so you can build your own comics page with a very wide selection.  There is an associated python application that can run once a day to get the latest comics.

Works well on all platforms and devices.

## Installation

All modules installed using npm plus mongoDB install.  You also require nginx installed, I have included the conf file for both Windows and Unix.  You will also require python27 for the comics page. For EC2 deployment I used the tutorial from http://www.robert-drummond.com/2013/04/25/a-node-js-application-on-the-amazon-cloud-part-1-installing-node-on-an-ec2-instance/

## Usage

Demonstration of my knowledge of node.js, mongoDB, angularJS, javascript, jquery() and other programming skills.

## Contributing

## History

See above

## Credits

Technext Limited who contributed the Photographer template (purchased) - the Best Free Responsive Photography HTML5 Template.

## License

OpenSource
