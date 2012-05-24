/**

JSZip - A Javascript class for generating Zip files
<http://stuartk.com/jszip>

(c) 2009 Stuart Knightley <stuart [at] stuartk.com>
Licenced under the GPLv3 and the MIT licences

Usage:
   zip = new JSZip();
   zip.file("hello.txt", "Hello, World!").add("tempfile", "nothing");
   zip.folder("images").file("smile.gif", base64Data, {base64: true});
   zip.file("Xmas.txt", "Ho ho ho !", {date : new Date("December 25, 2007 00:00:01")});
   zip.remove("tempfile");

   base64zip = zip.generate();

**/

/**
 * Representation a of zip file in js
 * @constructor
 * @param {String=} data the data to load, if any (optional).
 * @param {Object=} options the options for creating this objects (optional).
 */
var JSZip = function(data, options)
{
   // object containing the files :
   // {
   //   "folder/" : {...},
   //   "folder/data.txt" : {...}
   // }
   this.files = {};

   // Where we are in the hierarchy
   this.root = "";

   if(data) this.load(data, options);
};

JSZip.signature = {
   LOCAL_FILE_HEADER : "\x50\x4b\x03\x04",
   CENTRAL_FILE_HEADER : "\x50\x4b\x01\x02",
   CENTRAL_DIRECTORY_END : "\x50\x4b\x05\x06",
   ZIP64_CENTRAL_DIRECTORY_LOCATOR : "\x50\x4b\x06\x07",
   ZIP64_CENTRAL_DIRECTORY_END : "\x50\x4b\x06\x06",
   DATA_DESCRIPTOR : "\x50\x4b\x07\x08"
};

// Default properties for a new file
JSZip.defaults = {
   base64: false,
   binary: false,
   dir: false,
   date: null
};


JSZip.prototype = (function ()
{
   /**
    * A simple object representing a file in the zip file.
    * @constructor
    * @param {string} name the name of the file
    * @param {string} data the data
    * @param {Object} options the options of the file
    */
   var ZipObject = function (name, data, options)
   {
      this.name = name;
      this.data = data;
      this.options = options;
   };

   ZipObject.prototype = {
      /**
       * Return the content as UTF8 string.
       * @return {string} the UTF8 string.
       */
      asText : function ()
      {
         return this.options.binary ? JSZip.prototype.utf8decode(this.data) : this.data;
      },
      /**
       * Returns the binary content.
       * @return {string} the content as binary.
       */
      asBinary : function ()
      {
         return this.options.binary ? this.data : JSZip.prototype.utf8encode(this.data);
      }
   };

   /**
    * Transform an integer into a string in hexadecimal.
    * @private
    * @param {number} dec the number to convert.
    * @param {number} bytes the number of bytes to generate.
    * @returns {string} the result.
    */
   var decToHex = function(dec, bytes)
   {
      var hex = "", i;
      for(i = 0; i < bytes; i++)
      {
         hex += String.fromCharCode(dec&0xff);
         dec=dec>>>8;
      }
      return hex;
   };

   /**
    * Merge the objects passed as parameters into a new one.
    * @private
    * @param {...Object} var_args All objects to merge.
    * @return {Object} a new object with the data of the others.
    */
   var extend = function ()
   {
      var result = {}, i, attr;
      for (i = 0; i < arguments.length; i++) // arguments is not enumerable in some browsers
      {
         for (attr in arguments[i])
         {
            if(typeof result[attr] === "undefined")
            {
               result[attr] = arguments[i][attr];
            }
         }
      }
      return result;
   };

   /**
    * Transforms the (incomplete) options from the user into the complete
    * set of options to create a file.
    * @private
    * @param {Object} o the options from the user.
    * @return {Object} the complete set of options.
    */
   var prepareFileAttrs = function (o)
   {
      o = o || {};
      if (o.base64 === true && o.binary == null) o.binary = true;
      o = extend(o, JSZip.defaults);
      o.date = o.date || new Date();

      return o;
   };

  /**
   * Add a file in the current folder.
   * @private
   * @param {string} name the name of the file
   * @param {string} data the data of the file
   * @param {Object} o the options of the file
   * @return {Object} the new file.
   */
   var fileAdd = function (name, data, o)
   {
      // be sure sub folders exist
      var parent = parentFolder(name);
      if (parent) folderAdd.call(this, parent);

      o = prepareFileAttrs(o);

      return this.files[name] = {name: name, data: data, options:o};
   };


   /**
    * Find the parent folder of the path.
    * @private
    * @param {string} path the path to use
    * @return {string} the parent folder, or ""
    */
   var parentFolder = function (path)
   {
      if (path.slice(-1) == '/')
      {
         path = path.substring(0, path.length - 1);
      }
      var lastSlash = path.lastIndexOf('/');
      return (lastSlash > 0) ? path.substring(0, lastSlash) : "";
   };

   /**
    * Add a (sub) folder in the current folder.
    * @private
    * @param {string} name the folder's name
    * @return {Object} the new folder.
    */
   var folderAdd = function (name)
   {
      // Check the name ends with a /
      if (name.slice(-1) != "/") name += "/"; // IE doesn't like substr(-1)

      // Does this folder already exist?
      if (!this.files[name])
      {
         // be sure sub folders exist
         var parent = parentFolder(name);
         if (parent) folderAdd.call(this, parent);

         fileAdd.call(this, name, '', {dir:true});
      }
      return this.files[name];
   };

   /**
    * Generate the data found in the local header of a zip file.
    * Do not create it now, as some parts are re-used later.
    * @private
    * @param {Object} file the file to use.
    * @param {string} utfEncodedFileName the file name, utf8 encoded.
    * @param {string} compressionType the compression to use.
    * @return {Object} an object containing header and compressedData.
    */
   var prepareLocalHeaderData = function(file, utfEncodedFileName, compressionType)
   {
      var useUTF8 = utfEncodedFileName !== file.name,
          data    = file.data,
          o       = file.options,
          dosTime,
          dosDate;

      // date
      // @see http://www.delorie.com/djgpp/doc/rbinter/it/52/13.html
      // @see http://www.delorie.com/djgpp/doc/rbinter/it/65/16.html
      // @see http://www.delorie.com/djgpp/doc/rbinter/it/66/16.html

      dosTime = o.date.getHours();
      dosTime = dosTime << 6;
      dosTime = dosTime | o.date.getMinutes();
      dosTime = dosTime << 5;
      dosTime = dosTime | o.date.getSeconds() / 2;

      dosDate = o.date.getFullYear() - 1980;
      dosDate = dosDate << 4;
      dosDate = dosDate | (o.date.getMonth() + 1);
      dosDate = dosDate << 5;
      dosDate = dosDate | o.date.getDate();

      if (o.base64 === true) data = atob(data);
      // decode UTF-8 strings if we are dealing with text data
      if(o.binary === false) data = this.utf8encode(data);


      var compression    = JSZip.compressions[compressionType];
      var compressedData = compression.compress(data);

      var header = "";

      // version needed to extract
      header += "\x0A\x00";
      // general purpose bit flag
      // set bit 11 if utf8
      header += useUTF8 ? "\x00\x08" : "\x00\x00";
      // compression method
      header += compression.magic;
      // last mod file time
      header += decToHex(dosTime, 2);
      // last mod file date
      header += decToHex(dosDate, 2);
      // crc-32
      header += decToHex(this.crc32(data), 4);
      // compressed size
      header += decToHex(compressedData.length, 4);
      // uncompressed size
      header += decToHex(data.length, 4);
      // file name length
      header += decToHex(utfEncodedFileName.length, 2);
      // extra field length
      header += "\x00\x00";

      return {
         header:header,
         compressedData:compressedData
      };
   };
   
   var crc32table = [
        0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535,
        0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd,
        0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de, 0x1adad47d,
        0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec,
        0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4,
        0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c,
        0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac,
        0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f,
        0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924, 0x2f6f7c87, 0x58684c11, 0xc1611dab,
        0xb6662d3d, 0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f,
        0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb,
        0x086d3d2d, 0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e,
        0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea,
        0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65, 0x4db26158, 0x3ab551ce,
        0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a,
        0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9,
        0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409,
        0xce61e49f, 0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81,
        0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a, 0xead54739,
        0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8,
        0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344, 0x8708a3d2, 0x1e01f268,
        0x6906c2fe, 0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0,
        0x10da7a5a, 0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8,
        0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
        0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef,
        0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236, 0xcc0c7795, 0xbb0b4703,
        0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7,
        0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a,
        0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae,
        0x0cb61b38, 0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
        0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777, 0x88085ae6,
        0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45,
        0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7, 0x4969474d,
        0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5,
        0x47b2cf7f, 0x30b5ffe9, 0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605,
        0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94,
        0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d
   ];


   // return the actual prototype of JSZip
   return {
      /**
       * Read an existing zip and merge the data in the current JSZip object.
       * The implementation is in jszip-load.js, don't forget to include it.
       * @param {string} stream  The stream to load
       * @param {Object} options Options for loading the stream.
       *  options.base64 : is the stream in base64 ? default : false
       * @return {JSZip} the current JSZip object
       */
      load : function (stream, options)
      {
         throw new Error("Load method is not defined. Is the file jszip-load.js included ?");
      },

      /**
       * Filter nested files/folders with the specified function.
       * @param {Function} search the predicate to use :
       * function (relativePath, file) {...}
       * It takes 2 arguments : the relative path and the file.
       * @return {Array} An array of matching elements.
       */
      filter : function (search)
      {
         var result = [], filename, relativePath, file, fileClone;
         for (filename in this.files)
         {
            file = this.files[filename];
            // return a new object, don't let the user mess with our internal objects :)
            fileClone = new ZipObject(file.name, file.data, extend(file.options));
            relativePath = filename.slice(this.root.length, filename.length);
            if (filename.slice(0, this.root.length) === this.root // the file is in the current root
                && search(relativePath, fileClone)) // and the file matches the function
            {
               result.push(fileClone);
            }
         }
         return result;
      },

      /**
       * Add a file to the zip file, or search a file.
       * @param   {string|RegExp} name The name of the file to add (if data is defined),
       * the name of the file to find (if no data) or a regex to match files.
       * @param   {string} data  The file data, either raw or base64 encoded
       * @param   {Object} o     File options
       * @return  {JSZip|Object|Array} this JSZip object (when adding a file),
       * a file (when searching by string) or an array of files (when searching by regex).
       */
      file : function(name, data, o)
      {
         if (arguments.length === 1)
         {
            if (name instanceof RegExp)
            {
               var regexp = name;
               return this.filter(function(relativePath, file) {
                  return !file.options.dir && regexp.test(relativePath);
               });
            }
            else // text
            {
               return this.filter(function (relativePath, file) {
                  return !file.options.dir && relativePath === name;
               })[0]||null;
            }
         }
         else // more than one argument : we have data !
         {
            name = this.root+name;
            fileAdd.call(this, name, data, o);
         }
         return this;
      },

      /**
       * Add a directory to the zip file, or search.
       * @param   {String|RegExp} arg The name of the directory to add, or a regex to search folders.
       * @return  {JSZip} an object with the new directory as the root, or an array containing matching folders.
       */
      folder : function(arg)
      {
         if (!arg)
         {
            throw new Error("folder : wrong argument");
         }

         if (arg instanceof RegExp)
         {
            return this.filter(function(relativePath, file) {
               return file.options.dir && arg.test(relativePath);
            });
         }

         // else, name is a new folder
         var name = this.root + arg;
         var newFolder = folderAdd.call(this, name);

         // Allow chaining by returning a new object with this folder as the root
         var ret = this.clone();
         ret.root = newFolder.name;
         return ret;
      },

      /**
       * Delete a file, or a directory and all sub-files, from the zip
       * @param {string} name the name of the file to delete
       * @return {JSZip} this JSZip object
       */
      remove : function(name)
      {
         name = this.root + name;
         var file = this.files[name];
         if (!file)
         {
            // Look for any folders
            if (name.slice(-1) != "/") name += "/";
            file = this.files[name];
         }

         if (file)
         {
            if (!file.options.dir)
            {
               // file
               delete this.files[name];
            }
            else
            {
               // folder
               var kids = this.filter(function (relativePath, file) {
                  return file.name.slice(0, name.length) === name;
               });
               for (var i = 0; i < kids.length; i++)
               {
                  delete this.files[kids[i].name];
               }
            }
         }

         return this;
      },

      /**
       * Generate the complete zip file
       * @param {Object} options the options to generate the zip file :
       * - base64, true to generate base64.
       * - compression, "STORE" by default.
       * @return {string} the zip file
       */
      generate : function(options)
      {
         options = extend(options || {}, {
            base64 : true,
            compression : "STORE"
         });
         var compression = options.compression.toUpperCase();

         // The central directory, and files data
         var directory = [], files = [], fileOffset = 0;

         if (!JSZip.compressions[compression]) {
            throw compression + " is not a valid compression method !";
         }

         for (var name in this.files)
         {
            if( !this.files.hasOwnProperty(name) ) { continue; }

            var file = this.files[name];

            var utfEncodedFileName = this.utf8encode(file.name);

            var fileRecord = "",
            dirRecord = "",
            data = prepareLocalHeaderData.call(this, file, utfEncodedFileName, compression);
            fileRecord = JSZip.signature.LOCAL_FILE_HEADER + data.header + utfEncodedFileName + data.compressedData;

            dirRecord = JSZip.signature.CENTRAL_FILE_HEADER +
            // version made by (00: DOS)
            "\x14\x00" +
            // file header (common to file and central directory)
            data.header +
            // file comment length
            "\x00\x00" +
            // disk number start
            "\x00\x00" +
            // internal file attributes TODO
            "\x00\x00" +
            // external file attributes
            (this.files[name].dir===true?"\x10\x00\x00\x00":"\x00\x00\x00\x00")+
            // relative offset of local header
            decToHex(fileOffset, 4) +
            // file name
            utfEncodedFileName;

            fileOffset += fileRecord.length;

            files.push(fileRecord);
            directory.push(dirRecord);
         }

         var fileData = files.join("");
         var dirData = directory.join("");

         var dirEnd = "";

         // end of central dir signature
         dirEnd = JSZip.signature.CENTRAL_DIRECTORY_END +
         // number of this disk
         "\x00\x00" +
         // number of the disk with the start of the central directory
         "\x00\x00" +
         // total number of entries in the central directory on this disk
         decToHex(files.length, 2) +
         // total number of entries in the central directory
         decToHex(files.length, 2) +
         // size of the central directory   4 bytes
         decToHex(dirData.length, 4) +
         // offset of start of central directory with respect to the starting disk number
         decToHex(fileData.length, 4) +
         // .ZIP file comment length
         "\x00\x00";

         var zip = fileData + dirData + dirEnd;
         return (options.base64) ? btoa(zip) : zip;
      },
      
      crc32 : function(data, crc)
      {
          if( typeof(data) === 'undefined' || data.length === 0 )
              return 0;
          
          if( typeof(crc) == 'undefined' )
              crc = 0;
          
          var octet = 0;

          crc = crc ^ (-1);
          for( var i = 0, iTop = data.length; i < iTop; i++ )
          {
              octet = (crc ^ data.charCodeAt(i)) & 0xff;
              crc = (crc >>> 8) ^ crc32table[octet];
          }

          return crc ^ (-1);
      },

      // Inspired by http://my.opera.com/GreyWyvern/blog/show.dml/1725165
      clone : function()
      {
         var newObj = new JSZip();
         for (var i in this)
         {
            if (typeof this[i] !== "function")
            {
               newObj[i] = this[i];
            }
         }
         return newObj;
      },


      /**
       * http://www.webtoolkit.info/javascript-utf8.html
       */
      utf8encode : function (string) {
         string = string.replace(/\r\n/g,"\n");
         var utftext = "";

         for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
               utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
               utftext += String.fromCharCode((c >> 6) | 192);
               utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
               utftext += String.fromCharCode((c >> 12) | 224);
               utftext += String.fromCharCode(((c >> 6) & 63) | 128);
               utftext += String.fromCharCode((c & 63) | 128);
            }

         }

         return utftext;
      },

      /**
       * http://www.webtoolkit.info/javascript-utf8.html
       */
      utf8decode : function (utftext) {
         var string = "";
         var i = 0;
         var c = 0, c1 = 0, c2 = 0, c3 = 0;

         while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
               string += String.fromCharCode(c);
               i++;
            }
            else if((c > 191) && (c < 224)) {
               c2 = utftext.charCodeAt(i+1);
               string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
               i += 2;
            }
            else {
               c2 = utftext.charCodeAt(i+1);
               c3 = utftext.charCodeAt(i+2);
               string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
               i += 3;
            }

         }

         return string;
      }
   };
})();

/*
 * Compression methods
 * This object is filled in as follow :
 * name : {
 *    magic // the 2 bytes indentifying the compression method
 *    compress // function, take the uncompressed content and return it compressed.
 *    uncompress // function, take the compressed content and return it uncompressed.
 * }
 *
 * STORE is the default compression method, so it's included in this file.
 * Other methods should go to separated files : the user wants modularity.
 */
JSZip.compressions = {
   "STORE" : {
      magic : "\x00\x00",
      compress : function (content)
      {
         return content; // no compression
      },
      uncompress : function (content)
      {
         return content; // no compression
      }
   }
};

// enforcing Stuk's coding style
// vim: set shiftwidth=3 softtabstop=3:
