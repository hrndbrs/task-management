<?php

return [

    'disk' => env('EXPORTS_DISK', 'local'),

    // dompdf slows down sharply on very large tables; bigger exports should use CSV.
    'pdf_max_rows' => (int) env('EXPORTS_PDF_MAX_ROWS', 2000),

    'keep_for_days' => 7,

];
