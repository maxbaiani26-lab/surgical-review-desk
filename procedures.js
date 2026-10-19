/* Curated US-source procedure examples. Reviewed 2026-10-19. Not exhaustive; no billing codes or coverage claims. Specialty mappings are editorial and may overlap. */
(function(root){'use strict';
const catalog={
  "General surgery": [
    {
      "name": "Laparoscopic cholecystectomy",
      "source": "https://www.facs.org/for-patients/the-day-of-your-surgery/cholecystectomy/"
    },
    {
      "name": "Appendectomy",
      "source": "https://medlineplus.gov/ency/article/002921.htm"
    },
    {
      "name": "Thyroidectomy",
      "source": "https://medlineplus.gov/ency/article/002933.htm"
    },
    {
      "name": "Mastectomy",
      "source": "https://medlineplus.gov/ency/article/002919.htm"
    }
  ],
  "Orthopedic surgery": [
    {
      "name": "Total knee replacement",
      "source": "https://medlineplus.gov/ency/article/002974.htm"
    },
    {
      "name": "Hip joint replacement",
      "source": "https://medlineplus.gov/ency/article/002975.htm"
    },
    {
      "name": "Lumbar spinal fusion",
      "source": "https://medlineplus.gov/ency/article/002968.htm"
    }
  ],
  "Neurosurgery": [
    {
      "name": "Lumbar decompression (laminectomy)",
      "source": "https://medlineplus.gov/ency/article/007389.htm"
    },
    {
      "name": "Lumbar spinal fusion",
      "source": "https://medlineplus.gov/ency/article/002968.htm"
    }
  ],
  "Cardiothoracic surgery": [
    {
      "name": "Coronary artery bypass grafting",
      "source": "https://medlineplus.gov/ency/article/002946.htm"
    },
    {
      "name": "Lung lobectomy",
      "source": "https://medlineplus.gov/ency/article/002956.htm"
    },
    {
      "name": "Video-assisted thoracoscopic surgery",
      "source": "https://medlineplus.gov/ency/article/002956.htm"
    }
  ],
  "Vascular surgery": [
    {
      "name": "Carotid endarterectomy",
      "source": "https://medlineplus.gov/ency/article/002951.htm"
    },
    {
      "name": "Carotid angioplasty and stent placement",
      "source": "https://medlineplus.gov/ency/article/002953.htm"
    }
  ],
  "Urology": [
    {
      "name": "Radical prostatectomy",
      "source": "https://medlineplus.gov/ency/article/007300.htm"
    },
    {
      "name": "Simple prostatectomy",
      "source": "https://medlineplus.gov/ency/article/007416.htm"
    }
  ],
  "Ophthalmology": [
    {
      "name": "Cataract removal",
      "source": "https://medlineplus.gov/ency/article/002957.htm"
    },
    {
      "name": "Retinal detachment repair",
      "source": "https://medlineplus.gov/ency/article/002960.htm"
    }
  ],
  "Otolaryngology": [
    {
      "name": "Tonsillectomy",
      "source": "https://medlineplus.gov/ency/article/003013.htm"
    },
    {
      "name": "Adenoidectomy",
      "source": "https://medlineplus.gov/ency/article/003011.htm"
    },
    {
      "name": "Thyroidectomy",
      "source": "https://medlineplus.gov/ency/article/002933.htm"
    }
  ],
  "Obstetrics and gynecology": [
    {
      "name": "Hysterectomy",
      "source": "https://medlineplus.gov/ency/article/002915.htm"
    },
    {
      "name": "Myomectomy",
      "source": "https://medlineplus.gov/ency/article/000914.htm"
    },
    {
      "name": "Cesarean delivery",
      "source": "https://medlineplus.gov/ency/article/002911.htm"
    }
  ],
  "Colon and rectal surgery": [
    {
      "name": "Colectomy (large bowel resection)",
      "source": "https://medlineplus.gov/ency/article/002941.htm"
    },
    {
      "name": "Total proctocolectomy with ileal-anal pouch",
      "source": "https://medlineplus.gov/ency/article/007380.htm"
    },
    {
      "name": "Colostomy creation",
      "source": "https://medlineplus.gov/ency/article/002942.htm"
    }
  ],
  "Plastic surgery": [
    {
      "name": "Breast reconstruction with implants",
      "source": "https://medlineplus.gov/ency/article/007403.htm"
    },
    {
      "name": "Breast reconstruction with natural tissue",
      "source": "https://medlineplus.gov/ency/article/007404.htm"
    },
    {
      "name": "Cleft lip and palate repair",
      "source": "https://medlineplus.gov/ency/article/002979.htm"
    }
  ]
};
root.ProcedureCatalog=catalog;
if(typeof module!=='undefined')module.exports=catalog;
})(globalThis);
