import express from 'express';
import logger from './loaders/logger-loader';
import loader from './loaders';
import { sender } from './modules/Sender';

(async () => {

    const app = express();
    await loader();

    const port: any = process.env.PORT || 5006;

    const server = app.listen(port, () => {
        logger.info(`Server is listening on port ${port}...`);

        process.on("unhandledRejection", ex => {
            logger.error("index::undhandledRejection", ex);
        });

        process.on("unhandledException", ex => {
            logger.error("index::unhandledException", ex);
            throw ex;
        });

    });
   
    await sender()
  
})()
