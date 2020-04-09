# Base
FROM bisweb/devel:latest

MAINTAINER Xenios Papademetris <xpapademetris@gmail.com>

#Entry point
COPY entrypointtest2.sh /usr/local/bin/entrypointtest2.sh
RUN dos2unix /usr/local/bin/entrypointtest2.sh
RUN chmod +x /usr/local/bin/entrypointtest2.sh

# Configuration script
COPY biswebconfig.sh /usr/local/bin/biswebconfig.sh
RUN dos2unix /usr/local/bin/biswebconfig.sh
RUN chmod +x /usr/local/bin/biswebconfig.sh

# Specify entrypoint --
ENTRYPOINT ["bash", "/usr/local/bin/entrypointtest2.sh"]






