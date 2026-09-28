// Generated from lca-website src/lib/scanner/types.ts by tools/vendor-decoder.mjs. Do not edit.
/**
 * Data contracts for the scoresheet scanner pipeline.
 * Spec: SCANNER_SPEC.md §3.
 *
 * These types are the two-stage contract (§2.3): the vision model produces
 * RawScan (verbatim, no chess knowledge applied); the decoder consumes it
 * and produces DecodedGame (all chess legality applied here, and only here).
 * Never let a later stage blur this boundary.
 */

/** §3.1 RawScan — vision output, decoder input. */
                          
           
                   
                  
                   
                   
                       
                       
                         
                         
                                                        
                    
                         
                                                   
    
               
                                           
              
                               
                          
                          
     
                                                                                
                        
 

                          
                                                                              
              
                                                                          
                  
                                        
                                             
                   
 

/** §3.2 DecodedGame — decoder output, consumed by UI + PGN export. */
                              
                       
                                          
                                        
                          
                                                                          
                     
                                                    
 

                              
                                
              
                         
              
                                                                    
                           
             
                     
                            
                                         
                                                      
                                                      
                    
 

/**
 * §3.2 status semantics:
 * - matched:    raw string was exactly a legal SAN (after normalization §5.2)
 * - corrected:  fuzzy-matched within threshold
 * - guessed:    filled an illegible/blank slot from context (always low
 *               confidence, always shown flagged)
 * - flagged:    below confidence floor, needs user attention
 * - user-fixed: the member corrected it in the review UI
 */
                               
             
               
             
             
                 
