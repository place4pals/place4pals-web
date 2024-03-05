import Resizer from "react-image-file-resizer";
// @ts-expect-error https://github.com/onurzorluer/react-image-file-resizer/issues/68
const resizer: typeof Resizer = (Resizer.default || Resizer);
export const compressImage = ({ file, isProfile = false }) =>
    new Promise((resolve) => {
        resizer.imageFileResizer(
            file,
            isProfile ? 200 : 2000,
            isProfile ? 200 : 2000,
            'JPEG',
            80,
            0,
            uri => resolve(uri),
            'base64',
            0,
            0,
        );
    });