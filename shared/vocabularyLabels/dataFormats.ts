import type { SupportedLocale, DataFormat } from "../domain";

export const dataFormatLabels = {
  csv: {
    en: "CSV", fr: "CSV", es: "CSV", ar: "CSV", zh: "CSV", ru: "CSV",
  },
  tsv: {
    en: "TSV", fr: "TSV", es: "TSV", ar: "TSV", zh: "TSV", ru: "TSV",
  },
  parquet: {
    en: "Parquet", fr: "Parquet", es: "Parquet", ar: "Parquet", zh: "Parquet", ru: "Parquet",
  },
  json: {
    en: "JSON", fr: "JSON", es: "JSON", ar: "JSON", zh: "JSON", ru: "JSON",
  },
  xml: {
    en: "XML", fr: "XML", es: "XML", ar: "XML", zh: "XML", ru: "XML",
  },
  html: {
    en: "HTML", fr: "HTML", es: "HTML", ar: "HTML", zh: "HTML", ru: "HTML",
  },
  pdf: {
    en: "PDF", fr: "PDF", es: "PDF", ar: "PDF", zh: "PDF", ru: "PDF",
  },
  netcdf: {
    en: "NetCDF", fr: "NetCDF", es: "NetCDF", ar: "NetCDF", zh: "NetCDF", ru: "NetCDF",
  },
  zarr: {
    en: "Zarr", fr: "Zarr", es: "Zarr", ar: "Zarr", zh: "Zarr", ru: "Zarr",
  },
  bufr: {
    en: "BUFR", fr: "BUFR", es: "BUFR", ar: "BUFR", zh: "BUFR", ru: "BUFR",
  },
  geojson: {
    en: "GeoJSON", fr: "GeoJSON", es: "GeoJSON", ar: "GeoJSON", zh: "GeoJSON", ru: "GeoJSON",
  },
  shapefile: {
    en: "Shapefile", fr: "Shapefile", es: "Shapefile", ar: "Shapefile", zh: "Shapefile", ru: "Shapefile",
  },
  geopackage: {
    en: "GeoPackage", fr: "GeoPackage", es: "GeoPackage", ar: "GeoPackage", zh: "GeoPackage", ru: "GeoPackage",
  },
  kml: {
    en: "KML", fr: "KML", es: "KML", ar: "KML", zh: "KML", ru: "KML",
  },
  esri_file_geodatabase: {
    en: "Esri file geodatabase", fr: "Géodatabase fichier Esri", es: "Geodatabase de archivos Esri",
    ar: "قاعدة بيانات جغرافية ملفية من Esri", zh: "Esri 文件地理数据库", ru: "Файловая база геоданных Esri",
  },
  pmtiles: {
    en: "PMTiles", fr: "PMTiles", es: "PMTiles", ar: "PMTiles", zh: "PMTiles", ru: "PMTiles",
  },
  pbf: {
    en: "Protocol Buffers (PBF)", fr: "Protocol Buffers (PBF)", es: "Protocol Buffers (PBF)", ar: "Protocol Buffers (PBF)",
    zh: "Protocol Buffers (PBF)", ru: "Protocol Buffers (PBF)",
  },
  png: {
    en: "PNG", fr: "PNG", es: "PNG", ar: "PNG", zh: "PNG", ru: "PNG",
  },
  darwin_core_archive: {
    en: "Darwin Core Archive", fr: "Archive Darwin Core", es: "Archivo Darwin Core", ar: "أرشيف Darwin Core",
    zh: "Darwin Core 归档", ru: "Архив Darwin Core",
  },
  fasta: {
    en: "FASTA", fr: "FASTA", es: "FASTA", ar: "FASTA", zh: "FASTA", ru: "FASTA",
  },
  fastq: {
    en: "FASTQ", fr: "FASTQ", es: "FASTQ", ar: "FASTQ", zh: "FASTQ", ru: "FASTQ",
  },
  genbank_flatfile: {
    en: "GenBank flat file", fr: "Fichier plat GenBank", es: "Archivo plano GenBank", ar: "ملف GenBank مسطح", zh: "GenBank 平面文件",
    ru: "Плоский файл GenBank",
  },
  embl_flatfile: {
    en: "EMBL flat file", fr: "Fichier plat EMBL", es: "Archivo plano EMBL", ar: "ملف EMBL مسطح", zh: "EMBL 平面文件",
    ru: "Плоский файл EMBL",
  },
} satisfies Record<DataFormat, Record<SupportedLocale, string>>;
