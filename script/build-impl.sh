#!bash
#------------------------------------------------------------------------------
set -e

# ビルド
echo WEBPACK_OPTION=${WEBPACK_OPTION}
tcm src && webpack ${WEBPACK_OPTION}

#------------------------------------------------------------------------------
# EOF