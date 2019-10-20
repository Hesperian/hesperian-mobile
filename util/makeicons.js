/*
    Work in progress.

    Create the many sizes of iOS icons from a script.
    Really should create the splash screens too.
*/

const { exec } = require('child_process');

const ios = [
    {
        size: 20
    },
    {
        size: 29
    },
    {
        size: 40
    },
    {
        size: 50
    },
    {
        size: 57
    },
    {
        size: 58
    },
    {
        size: 60
    },
    {
        size: 72
    },
    {
        size: 80
    },
    {
        size: 87
    },
    {
        size: 100
    },
    {
        size: 114
    },
    {
        size: 120
    },
    {
        size: 144
    },
    {
        size: 152
    },
    {
        size: 167
    },
    {
        size: 180
    }
];


function makeIcon(spec, destDir) {
    const name = `AppIcon-${spec.size}.png`;
    const cmd = `convert icon-source.png -resize ${spec.size}x${spec.size} ${destDir}/${name}`;
   // console.log(cmd);
   console.log(`<icon src="resources/icons/ios/${name}" platform="ios" width="${spec.size}" height="${spec.size}" />`);

    exec(cmd, (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          return;
        }
      });
}

ios.forEach(spec => {
    makeIcon(spec, 'ios');
})
