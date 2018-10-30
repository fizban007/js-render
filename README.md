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

	http://localhost:5050/render/?path=PATH&filename=FILE
	
Remember to change `5050` to whatever port you used above for the server. `PATH` and `FILE` are separately the path to the hdf5 file you want to visualize, and the name of the file. You can also change this file later in the mini gui.

If you want to do this on your own machine you could do that too. Just bind the port to your own machine using:

	ssh -L 5050:localhost:5050 user@server
	
then navigate to the above url as if it is on your own machine.

# How to use

Initially when you load the webpage you will see a sphere and some controls on the upper right corner. The texture will load in 20~30 seconds, so don't panic. The controls are pretty self-explanatory. You can change the file it's rendering in the `filename` box.

Keyboard controls:

- `WSAD`: Pan the camera around
- `Space`: Reset camera
- `Arrow Keys`: Rotate camera around
- `Shift + Up/Down`: Adjust camera FOV
- `Q`: Decrease alpha correction
- `E`: Increase alpha correction
