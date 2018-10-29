#!/usr/bin/python
import h5py
import numpy as np
# import PIL
from PIL import Image
from functools import lru_cache
import io
import time

@lru_cache(maxsize=32)
def makePNG(fname):
    print('making png')
    res = 512
    tile_x = 32
    tile_y = res // tile_x
    width = tile_x * res
    height = tile_y * res

    with h5py.File(fname, 'r') as f:
        data_dens = f['dens'][:,:,:]
        data_densi = f['densi'][:,:,:]
        f.close()
    print('Finished reading hdf data')
    dims = data_dens.shape
    print(dims)
    # img = np.zeros((width, height), dtype = 'uint32')
    print("Finished initializing data")

    offset = (dims[0] - res) // 2
    max_val = 100.0
    print(offset)
    # start = time.time()
    data1 = data_dens[offset:dims[0]-offset, offset:dims[1]-offset, offset:dims[2]-offset]
    data2 = data_densi[offset:dims[0]-offset, offset:dims[1]-offset, offset:dims[2]-offset]
    # assign pixel values
    alpha = (np.minimum(data1*256./max_val, 255).astype('uint32') << 24)
    blue = (np.minimum((data1 + data2)*256./max_val, 255).astype('uint32') << 16)
    green = (np.minimum(np.abs(data1 - data2)*256./max_val, 255).astype('uint32') << 8)
    red = (np.minimum(data2*256./max_val, 255).astype('uint32'))

    img = (red + blue + green + alpha).reshape(tile_y, tile_x, res,res).swapaxes(1,2).reshape(width, height)
    # end = time.time()
    img = Image.frombytes('RGBA', img.shape, img)
    img_io = io.BytesIO()
    img.save(img_io, format='png', compress_level=1)
    return img_io

if __name__ == "__main__":
    print("In main")
    makePNG()
