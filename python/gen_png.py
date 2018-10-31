import h5py
import numpy as np
from PIL import Image
from functools import lru_cache
import interp
import io
import time

# @lru_cache(maxsize=32)
# def makePNG(fname):
#     print('making png')
#     res = 512
#     tile_x = 32
#     tile_y = res // tile_x
#     width = tile_x * res
#     height = tile_y * res

#     with h5py.File(fname, 'r') as f:
#         data_dens = f['dens'][:,:,:]
#         data_densi = f['densi'][:,:,:]
#         data_bdensi = f['bdensi'][:,:,:]
#         f.close()
#     print('Finished reading hdf data')
#     dims = data_dens.shape
#     print(dims)
    
#     offset = (dims[0] - res) // 2
#     max_val = 100.0
#     print(offset)
#     # start = time.time()
#     data1 = data_dens[offset:dims[0]-offset, offset:dims[1]-offset, offset:dims[2]-offset]
#     data2 = data_densi[offset:dims[0]-offset, offset:dims[1]-offset, offset:dims[2]-offset]
#     data3 = data_bdensi[offset:dims[0]-offset, offset:dims[1]-offset, offset:dims[2]-offset]
#     # assign pixel values
#     alpha = (np.minimum(data1*256./max_val, 255).astype('uint32') << 24)
#     blue = (np.minimum(data3*256./max_val, 255).astype('uint32') << 16)
#     green = (np.minimum(np.abs(data1 - data2)*256./max_val, 255).astype('uint32') << 8)
#     red = (np.minimum(data2*256./max_val, 255).astype('uint32'))

#     img = (red + blue + green + alpha).reshape(tile_y, tile_x, res,res).swapaxes(1,2).reshape(width, height)
#     # end = time.time()
#     img = Image.frombytes('RGBA', img.shape, img)
#     img_io = io.BytesIO()
#     img.save(img_io, format='png', compress_level=1)
#     return img_io

@lru_cache(maxsize=32)
def hdf2png(fname, res=0, max_val=100.0):
    print("Generating png for file "+fname+" at resolution %d" % res)
    tile_x = 16
    with h5py.File(fname, 'r') as f:
        dens = f['dens'].value
        densi = f['densi'].value
        bdensi = f['bdensi'].value
        f.close()
    print('Finished reading hdf data')
    dims = dens.shape
    print(dims)

    # resample the data to target resolution
    if res == 0:
        data = interp.adaptive_resample(dens)
        datai = interp.adaptive_resample(densi)
        databi = interp.adaptive_resample(bdensi)
    else:
        data = interp.resample(dens, (res, res, res))
        datai = interp.resample(densi, (res, res, res))
        databi = interp.resample(bdensi, (res, res, res))
    print('Finished resampling')
    if data.shape[0]>=512: tile_x = 32
    tile_y = data.shape[0] // tile_x
    img_width = tile_x * data.shape[2]
    img_height = tile_y * data.shape[1]

    # assign pixel values
    alpha = (np.minimum(data*256./max_val, 255).astype('uint32') << 24)
    blue = (np.minimum(databi*256./max_val, 255).astype('uint32') << 16)
    green = (np.minimum(np.abs(data - datai)*256./max_val, 255).astype('uint32') << 8)
    red = (np.minimum(datai*256./max_val, 255).astype('uint32'))

    # contruct the image and return it
    img = (red + blue + green + alpha).reshape(tile_y, tile_x, data.shape[2], data.shape[1] ).swapaxes(1,2).reshape(img_width, img_height)
    # end = time.time()
    img = Image.frombytes('RGBA', img.shape, img)
    img_io = io.BytesIO()
    img.save(img_io, format='png', compress_level=1)
    return img_io, tile_x, tile_y, data.shape[2], data.shape[1]
    
