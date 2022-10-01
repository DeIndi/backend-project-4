import { writeFile } from 'node:fs/promises';
import axios from 'axios';

const pageLoad = (link) => {
  axios.get(link).then(async (resp) => {
    const protocols = /https:\/\/|http:\/\/|ftp:\/\//;
    await writeFile(String(`${link.replace(protocols, '').split('.').join('-')}.html`), resp.data);
  });
};

export default pageLoad;
