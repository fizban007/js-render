#!/usr/bin/python
import h5py
import numpy as np
# import PIL
from PIL import Image
from functools import lru_cache
import io
import time

def clamp(val, max):
    return min(int(abs(val)*256./max), 255)

def clamp2png(data_i, data_e, tile_x, tile_y, res, offset, img):
  print(res, tile_x, tile_y)
  for k in range(res):
    k1 = k % tile_x
    k2 = k // tile_x
    for j in range(res):
      for i in range(res):
        val_i = data_i[k + offset][j + offset][i + offset]
        val_e = data_e[k + offset][j + offset][i + offset]
        # img[k1 * res + i, k2 * res + j] = clamp(val_i, 100.0)
        # img[k1 * res + i, k2 * res + j] = clamp(val_i - val_e + 50.0, 100.0)
        # img[k1 * res + i, k2 * res + j] = clamp(val_e, 100.0)
        img[k1 * res + i, k2 * res + j] = clamp(val_i + val_e, 100.0)

@lru_cache(maxsize=32)
def makePNG(fname):
    print('making png')
    res = 512
    tile_x = 32
    tile_y = res // tile_x
    width = tile_x * res
    height = tile_y * res

    with h5py.File(fname, 'r') as f:
        data_e = f['dens'][:,:,:]
        data_i = f['densi'][:,:,:]
    print('Finished reading hdf data')
    dims = data_e.shape
    print(dims)
    # img = np.zeros((width, height), dtype = 'uint32')
    print("Finished initializing data")

    offset = (dims[0] - res) // 2
    print(offset)
    start = time.time()
    data1 = data_e[offset:dims[0]-offset, offset:dims[1]-offset, offset:dims[2]-offset]
    data2 = data_i[offset:dims[0]-offset, offset:dims[1]-offset, offset:dims[2]-offset]
    red = (np.minimum(data1*256./100., 255).astype('uint32') << 24)
    blue = (np.minimum(data2*256./100., 255).astype('uint32') << 16)
    green = (np.minimum((data1 - data2)*256./100., 255).astype('uint32') << 8)
    alpha = (np.minimum((data1 + data2)*256./100., 255).astype('uint32'))
            # (np.minimum(data2*256./100., 255).astype('uint32') << 16) +
            # (np.minimum((data1 + data2)*256./100., 255).astype('uint32'))
    img = (red + blue + alpha).reshape(tile_y, tile_x, res,res).swapaxes(1,2).reshape(width, height)
    # assign pixel values
    # clamp2png(data_i, data_e, tile_x, tile_y, res, offset, img)
    end = time.time()
    print("clamp used", end - start)
    img = Image.frombytes('RGBA', img.shape, img)
    img_io = io.BytesIO()
    img.save(img_io, format='png', compress_level=1)
    return img_io
    # img.save('/home/alex/storage/Data/test' + str(res) + '.png' , format='png',compress_level = 1)

if __name__ == "__main__":
    print("In main")
    makePNG()
