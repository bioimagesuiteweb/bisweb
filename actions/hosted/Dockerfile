# Base
FROM bisweb/devel:latest

MAINTAINER Xenios Papademetris <xpapademetris@gmail.com>

#Entry point
COPY entrypointtest.sh /usr/local/bin/entrypointtest.sh
RUN dos2unix /usr/local/bin/entrypointtest.sh
RUN chmod +x /usr/local/bin/entrypointtest.sh


# Specify entrypoint --
ENTRYPOINT ["bash", "/usr/local/bin/entrypointtest.sh"]






