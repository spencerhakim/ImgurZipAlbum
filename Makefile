PREFIX = .
SRC_DIR = ${PREFIX}/src
BUILD_DIR = ${PREFIX}/build
OUT_DIR = ${PREFIX}/min

# Locate node.js
JS_ENGINE ?= "`which node nodejs 2>/dev/null`"
COMPILER = ${JS_ENGINE} ${BUILD_DIR}/bin/uglifyjs.js --unsafe --overwrite

# Input files to be merged together. List in ordered required
MODULES = ${SRC_DIR}/intro.js \
	${SRC_DIR}/ImgurZipAlbum.js \
	${SRC_DIR}/main.js \
	${SRC_DIR}/outro.js

# Output
IZA = ${OUT_DIR}/imgurzipalbum.min.js

# Pre-processing
DATE = $(shell git log -1 --pretty=format:%ad)
BASEURL = http:\/\/spencerhakim.github.com\/ImgurZipAlbum\/
PREPROCESS = "sed 's/@@DATE@@/'\"${DATE}\"'/' | \
	sed 's/@@BASEURL@@/'\"${BASEURL}\"'/'"

###########################################################

# Targets
all: iza hint minify

rebuild: clean all

${OUT_DIR}:
	@@mkdir -p ${OUT_DIR}

iza: ${IZA}

${IZA}: ${MODULES} | ${OUT_DIR}
	@@echo "Building..."
	@@cat ${MODULES} | eval ${PREPROCESS} > ${IZA}

hint: iza
	@@if test ! -z ${JS_ENGINE}; then \
		echo "Testing against JSHint..."; \
		${JS_ENGINE} ${BUILD_DIR}/jshint-check.js ${IZA}; \
	else \
		echo "You must have NodeJS installed in order to test against JSHint."; \
	fi

minify: iza
	@@echo "Uglify-ing..."
	@@${COMPILER} ${IZA}

###########################################################

clean:
	@@rm -rf ${OUT_DIR}
	@@echo "Cleaned"

###########################################################

.PHONY: all rebuild iza hint minify clean