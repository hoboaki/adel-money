#!bash
#------------------------------------------------------------------------------
set -eu

# public のクリーン
bash ./script/clean-public.sh

# build のクリーン
rm -rf ./build/mac

# ビルド
export WEBPACK_OPTION="--env prod" && bash ./script/build-impl.sh

# パッケージング
NODE_ENV=production electron-builder --mac --universal

#------------------------------------------------------------------------------
# EOF
