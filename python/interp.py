import numpy as np
import scipy.interpolate as interp

def downsample(data, shape):
    z = np.linspace(0,1,data.shape[0])
    y = np.linspace(0,1,data.shape[1])
    x = np.linspace(0,1,data.shape[2])
    new_z = np.linspace(0,1,shape[0])
    new_y = np.linspace(0,1,shape[1])
    new_x = np.linspace(0,1,shape[2])

    interpx = interp.interp1d(x, data, kind='linear')
    tmp1 = interpx(new_x)

    interpy = interp.interp1d(y, tmp1, axis=1, kind='linear')
    tmp2 = interpy(new_y)

    interpz = interp.interp1d(z, tmp2, axis=0, kind='linear')
    result = interpz(new_z)

    return result
