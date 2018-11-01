Volume Rendering in Javascript
==============================

# How to run

First clone this directory on the server you want to visualize the data on (presumably `tigressdata`):

    git clone https://github.com/fizban007/js-render.git
	
Now you need to load the python modules. Best way is probably:

    module load anaconda3
	
Then you can launch the server using the following command:

	python ./app.py 5050
	
Note that `5050` is the default port if you don't supply the port number. You can change it to whatever you like. Use a higher port if you want to avoid conflict with other people's running software.

Now to access the web page, you could launch a browser on `tigressdata` and point to the following url:

	http://localhost:5050/?path=PATH&filename=FILE
	
Remember to change `5050` to whatever port you used above for the server. `PATH` and `FILE` are separately the path to the hdf5 file you want to visualize, and the name of the file. You can also change this file later in the mini gui.

If you want to do this on your own machine you could do that too. Just bind the port to your own machine using:

	ssh -L 5050:localhost:5050 user@server
	
then navigate to the above url as if it is on your own machine.

The data will be resampled to a resolution that is a power of 2. If the original data is already close to a power of 2, then the code will either cut out excess from the boundary, or pad it. If the original data falls somewhere between powers of two, then the code will use the closest one that is just smaller than the data resolution. All data is assumed to have aspect ratio of 1:1:1. If not, the data should still load, but will show up stretched when rendered in the unit box.

To force a resolution, append to the url a `res` argument like this:

	http://localhost:5050/?path=PATH&filename=FILE&res=256

This will force the rendering to be at 256x256x256 by interpolating the data to this grid size. 512 is the highest recommended. 1024 will require a LOT of memory and likely crash the server. 64 or lower will give a very blocky and blurry effect.

# How to use

Initially when you load the webpage you will see a sphere and some controls on the upper right corner. The texture will load in 20~30 seconds, so don't panic. The controls are pretty self-explanatory. You can change the file it's rendering in the `filename` box.

Keyboard controls:

- `WSAD`: Pan the camera around
- `Space`: Reset camera
- `Arrow Keys`: Rotate camera around
- `Shift + Up/Down`: Adjust camera FOV
- `Q`: Decrease alpha correction
- `E`: Increase alpha correction
- `Ctrl + S`: Save current view and config to a local file
- `Ctrl + L`: Load view and config from a local file

# Roadmap

- [ ] Add field lines
- [ ] Save/load the png texture for a given file
- [ ] Add an interface for the user to choose how the png is generated, including components and scale
- [ ] Add the functionality of generating a series of png files, thus making it possible to move between frames
- [ ] Making movies (with camera control?)
